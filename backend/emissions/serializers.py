from rest_framework import serializers
from django.contrib.auth import get_user_model
from emissions.models import Client, DataUpload, EmissionRecord, AuditLog, EmissionFactor

User = get_user_model()

class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'name', 'slug', 'created_at', 'is_active']

class DataUploadSerializer(serializers.ModelSerializer):
    uploaded_by_detail = UserMiniSerializer(source='uploaded_by', read_only=True)
    
    class Meta:
        model = DataUpload
        fields = [
            'id', 'client', 'source_type', 'uploaded_by', 'uploaded_by_detail',
            'uploaded_at', 'filename', 'status', 'row_count', 'error_count', 'error_log'
        ]

class EmissionRecordSerializer(serializers.ModelSerializer):
    reviewed_by_detail = UserMiniSerializer(source='reviewed_by', read_only=True)
    
    class Meta:
        model = EmissionRecord
        fields = [
            'id', 'client', 'upload', 'source_type', 'scope', 'activity_date',
            'amount', 'unit', 'normalized_amount_kg_co2e', 'raw_data', 'status',
            'flag_reason', 'reviewed_by', 'reviewed_by_detail', 'reviewed_at',
            'is_edited', 'original_data', 'created_at', 'updated_at'
        ]
        read_only_fields = ['normalized_amount_kg_co2e', 'is_edited', 'original_data']

class AuditLogSerializer(serializers.ModelSerializer):
    performed_by_detail = UserMiniSerializer(source='performed_by', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'record', 'action', 'performed_by', 'performed_by_detail',
            'timestamp', 'old_value', 'new_value', 'notes'
        ]

class EmissionFactorSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmissionFactor
        fields = ['id', 'category', 'subcategory', 'factor_value', 'unit', 'source', 'valid_from', 'valid_to']
