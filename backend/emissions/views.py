from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Count
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from decimal import Decimal
import json

from emissions.models import Client, DataUpload, EmissionRecord, AuditLog, EmissionFactor
from emissions.serializers import (
    ClientSerializer, DataUploadSerializer, EmissionRecordSerializer,
    AuditLogSerializer, EmissionFactorSerializer
)
from emissions.services.parsers import process_sap_upload, process_utility_upload, process_travel_upload
from emissions.services.calculations import (
    calculate_sap_fuel_emissions,
    calculate_utility_electricity_emissions,
    calculate_travel_emissions
)
from emissions.services.flagging import auto_flag_record

class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]

class DataUploadViewSet(viewsets.ModelViewSet):
    queryset = DataUpload.objects.all().order_by('-uploaded_at')
    serializer_class = DataUploadSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_client(self):
        # Retrieve client from request header, falling back to first client
        client_slug = self.request.headers.get('X-Client-Slug')
        if client_slug:
            return get_object_or_404(Client, slug=client_slug)
        client = Client.objects.first()
        if not client:
            client = Client.objects.create(name="breatheesg Manufacturing", slug="breatheesg-mfg")
        return client

    def list(self, request, *args, **kwargs):
        client = self.get_client()
        queryset = self.get_queryset().filter(client=client)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='sap')
    def upload_sap(self, request):
        if 'file' not in request.FILES:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
        
        client = self.get_client()
        uploaded_file = request.FILES['file']
        
        data_upload = DataUpload.objects.create(
            client=client,
            source_type='SAP',
            uploaded_by=request.user,
            filename=uploaded_file.name,
            status='PROCESSING'
        )
        
        try:
            process_sap_upload(client, data_upload, uploaded_file, request.user)
            serializer = self.get_serializer(data_upload)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            data_upload.status = 'FAILED'
            data_upload.error_log = [{"row": 0, "error": str(e)}]
            data_upload.save()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='utility')
    def upload_utility(self, request):
        if 'file' not in request.FILES:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
        
        client = self.get_client()
        uploaded_file = request.FILES['file']
        
        data_upload = DataUpload.objects.create(
            client=client,
            source_type='UTILITY',
            uploaded_by=request.user,
            filename=uploaded_file.name,
            status='PROCESSING'
        )
        
        try:
            process_utility_upload(client, data_upload, uploaded_file, request.user)
            serializer = self.get_serializer(data_upload)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            data_upload.status = 'FAILED'
            data_upload.error_log = [{"row": 0, "error": str(e)}]
            data_upload.save()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='travel')
    def upload_travel(self, request):
        if 'file' not in request.FILES:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
        
        client = self.get_client()
        uploaded_file = request.FILES['file']
        
        data_upload = DataUpload.objects.create(
            client=client,
            source_type='TRAVEL',
            uploaded_by=request.user,
            filename=uploaded_file.name,
            status='PROCESSING'
        )
        
        try:
            process_travel_upload(client, data_upload, uploaded_file, request.user)
            serializer = self.get_serializer(data_upload)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            data_upload.status = 'FAILED'
            data_upload.error_log = [{"row": 0, "error": str(e)}]
            data_upload.save()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EmissionRecordViewSet(viewsets.ModelViewSet):
    queryset = EmissionRecord.objects.all().order_by('-activity_date')
    serializer_class = EmissionRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_client(self):
        client_slug = self.request.headers.get('X-Client-Slug')
        if client_slug:
            return get_object_or_404(Client, slug=client_slug)
        client = Client.objects.first()
        if not client:
            client = Client.objects.create(name="breatheesg Manufacturing", slug="breatheesg-mfg")
        return client

    def get_queryset(self):
        client = self.get_client()
        qs = self.queryset.filter(client=client)
        
        # Apply filters
        source_type = self.request.query_params.get('source_type')
        if source_type:
            qs = qs.filter(source_type=source_type)
            
        scope = self.request.query_params.get('scope')
        if scope:
            qs = qs.filter(scope=scope)
            
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
            
        date_start = self.request.query_params.get('date_start')
        if date_start:
            qs = qs.filter(activity_date__gte=date_start)
            
        date_end = self.request.query_params.get('date_end')
        if date_end:
            qs = qs.filter(activity_date__lte=date_end)
            
        return qs

    def update(self, request, *args, **kwargs):
        """
        Custom update handler to recalculate carbon emissions when fields change,
        and log the edit details into the AuditLog.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Capture old values
        old_data = {
            "amount": str(instance.amount),
            "unit": instance.unit,
            "activity_date": str(instance.activity_date),
            "status": instance.status
        }
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Perform recalculation prior to saving
        validated_data = serializer.validated_data
        
        # Extract fields or keep old ones
        amount = validated_data.get('amount', instance.amount)
        unit = validated_data.get('unit', instance.unit)
        activity_date = validated_data.get('activity_date', instance.activity_date)
        
        # Run recalculation based on source type
        co2e = instance.normalized_amount_kg_co2e
        details = ""
        
        if instance.source_type == 'SAP':
            raw_text = instance.raw_data.get('BKTXT', '')
            matnr = instance.raw_data.get('MATNR', '')
            _, _, co2e, _, _ = calculate_sap_fuel_emissions(amount, unit, raw_text, matnr)
        elif instance.source_type == 'UTILITY':
            _, _, co2e = calculate_utility_electricity_emissions(amount)
        elif instance.source_type == 'TRAVEL':
            exp_type = instance.raw_data.get('expense_type', '')
            origin = instance.raw_data.get('origin_code', '')
            destination = instance.raw_data.get('destination_code', '')
            nights = instance.raw_data.get('nights_stayed')
            nights_val = int(float(nights)) if nights else None
            _, _, co2e, _, _, details = calculate_travel_emissions(exp_type, origin, destination, amount, nights_val)

        # Snapshot original raw data on first edit
        if not instance.is_edited:
            instance.is_edited = True
            instance.original_data = {
                "amount": str(instance.amount),
                "unit": instance.unit,
                "activity_date": str(instance.activity_date),
                "normalized_amount_kg_co2e": str(instance.normalized_amount_kg_co2e)
            }
            
        instance.amount = amount
        instance.unit = unit
        instance.activity_date = activity_date
        instance.normalized_amount_kg_co2e = co2e
        
        # Check flags again
        instance.flag_reason = None
        instance.status = validated_data.get('status', 'PENDING')
        auto_flag_record(instance)
        
        if details and 'IATA coordinates missing' in details:
            instance.status = 'FLAGGED'
            instance.flag_reason = f"{instance.flag_reason} | {details}" if instance.flag_reason else details
            
        instance.save()
        
        new_data = {
            "amount": str(instance.amount),
            "unit": instance.unit,
            "activity_date": str(instance.activity_date),
            "status": instance.status,
            "normalized_amount_kg_co2e": str(instance.normalized_amount_kg_co2e)
        }
        
        # Audit Log Entry
        reason = request.data.get('reason', 'Inline Edit of emission fields')
        AuditLog.objects.create(
            record=instance,
            action='EDIT',
            performed_by=request.user,
            old_value=old_data,
            new_value=new_data,
            notes=reason
        )
        
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve_record(self, request, pk=None):
        record = self.get_object()
        old_status = record.status
        
        record.status = 'APPROVED'
        record.reviewed_by = request.user
        record.reviewed_at = timezone.now()
        record.save()
        
        AuditLog.objects.create(
            record=record,
            action='APPROVE',
            performed_by=request.user,
            old_value={"status": old_status},
            new_value={"status": "APPROVED"},
            notes=request.data.get('notes', 'Record approved in review dashboard.')
        )
        
        return Response(self.get_serializer(record).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject_record(self, request, pk=None):
        record = self.get_object()
        old_status = record.status
        
        record.status = 'REJECTED'
        record.reviewed_by = request.user
        record.reviewed_at = timezone.now()
        record.save()
        
        AuditLog.objects.create(
            record=record,
            action='REJECT',
            performed_by=request.user,
            old_value={"status": old_status},
            new_value={"status": "REJECTED"},
            notes=request.data.get('notes', 'Record rejected by reviewer.')
        )
        
        return Response(self.get_serializer(record).data)

    @action(detail=False, methods=['post'], url_path='bulk-approve')
    def bulk_approve(self, request):
        record_ids = request.data.get('record_ids', [])
        if not record_ids:
            return Response({"error": "No record IDs provided"}, status=status.HTTP_400_BAD_REQUEST)
            
        client = self.get_client()
        records = EmissionRecord.objects.filter(id__in=record_ids, client=client)
        
        approved_count = 0
        with transaction.atomic():
            for rec in records:
                if rec.status != 'APPROVED':
                    old_status = rec.status
                    rec.status = 'APPROVED'
                    rec.reviewed_by = request.user
                    rec.reviewed_at = timezone.now()
                    rec.save()
                    
                    AuditLog.objects.create(
                        record=rec,
                        action='APPROVE',
                        performed_by=request.user,
                        old_value={"status": old_status},
                        new_value={"status": "APPROVED"},
                        notes="Bulk approved via review dashboard."
                    )
                    approved_count += 1
                    
        return Response({
            "message": f"Successfully approved {approved_count} records.",
            "approved_count": approved_count
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary_stats(self, request):
        client = self.get_client()
        records = EmissionRecord.objects.filter(client=client)
        
        total_records = records.count()
        pending = records.filter(status='PENDING').count()
        flagged = records.filter(status='FLAGGED').count()
        approved = records.filter(status='APPROVED').count()
        rejected = records.filter(status='REJECTED').count()
        
        # Calculate total approved emissions in Metric Tonnes CO2e
        approved_co2e_kg = records.filter(status='APPROVED').aggregate(total=Sum('normalized_amount_kg_co2e'))['total'] or 0.0
        total_co2e_tonnes = float(approved_co2e_kg) / 1000.0
        
        return Response({
            "total_records": total_records,
            "pending_count": pending,
            "flagged_count": flagged,
            "approved_count": approved,
            "rejected_count": rejected,
            "total_co2e_tonnes": round(total_co2e_tonnes, 4)
        })

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        client_slug = self.request.headers.get('X-Client-Slug')
        if client_slug:
            client = get_object_or_404(Client, slug=client_slug)
        else:
            client = Client.objects.first()
            if not client:
                client = Client.objects.create(name="breatheesg Manufacturing", slug="breatheesg-mfg")
                
        qs = self.queryset.filter(record__client=client)
        
        # Apply filters
        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(performed_by_id=user_id)
            
        action_type = self.request.query_params.get('action')
        if action_type:
            qs = qs.filter(action=action_type)
            
        return qs
