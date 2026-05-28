import csv
import io
from datetime import datetime
from decimal import Decimal
from django.db import transaction
from emissions.models import EmissionRecord, AuditLog, DataUpload
from emissions.services.calculations import (
    calculate_sap_fuel_emissions,
    calculate_utility_electricity_emissions,
    calculate_travel_emissions
)
from emissions.services.flagging import auto_flag_record

def parse_decimal_value(val):
    if not val or str(val).strip() == "":
        return Decimal('0.00')
    val_str = str(val).strip()
    
    # Check for German vs English format
    if ',' in val_str and '.' in val_str:
        if val_str.find('.') < val_str.find(','):
            # German 1.234,56 -> 1234.56
            val_str = val_str.replace('.', '').replace(',', '.')
        else:
            # English 1,234.56 -> 1234.56
            val_str = val_str.replace(',', '')
    elif ',' in val_str:
        parts = val_str.split(',')
        if len(parts[-1]) == 3:
            # e.g., 1,500 -> 1500
            val_str = val_str.replace(',', '')
        else:
            # e.g., 1,5 -> 1.5
            val_str = val_str.replace(',', '.')
            
    try:
        return Decimal(val_str)
    except Exception:
        raise ValueError(f"Invalid numeric value: '{val}'")

def parse_date_value(date_str):
    if not date_str or str(date_str).strip() == "":
        return None
    ds = str(date_str).strip()
    
    # Support multiple formats
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(ds, fmt).date()
        except ValueError:
            continue
            
    # Try SAP format YYYYMMDD
    try:
        return datetime.strptime(ds, "%Y%m%d").date()
    except ValueError:
        pass
        
    raise ValueError(f"Invalid date format: '{date_str}'")

def process_sap_upload(client, data_upload, file_content, user):
    """
    Parses tab-separated SAP Flat File.
    Columns: MANDT, BUKRS, BELNR, BLDAT, BUDAT, LIFNR, MATNR, MENGE, MEINS, DMBTR, WAERS, WERKS, KOSTL, BKTXT
    """
    # Read file content as text
    if isinstance(file_content, bytes):
        text_content = file_content.decode('utf-8-sig')
    else:
        text_content = file_content.read().decode('utf-8-sig')

    f = io.StringIO(text_content)
    reader = csv.DictReader(f, delimiter='\t')
    
    row_count = 0
    error_count = 0
    error_log = []
    
    # Required columns check
    required_cols = ['BUDAT', 'MENGE', 'MEINS', 'BKTXT']
    
    for idx, row in enumerate(reader, start=1):
        row_count += 1
        try:
            # Validate headers are present
            missing_cols = [c for c in required_cols if c not in row]
            if missing_cols:
                raise ValueError(f"Missing required columns in header: {missing_cols}")

            # Parse fields
            raw_date = row.get('BUDAT') or row.get('BLDAT')
            activity_date = parse_date_value(raw_date)
            menge_raw = row.get('MENGE')
            amount = parse_decimal_value(menge_raw)
            unit = row.get('MEINS', '').strip()
            description = row.get('BKTXT', '').strip()
            matnr = row.get('MATNR', '').strip()
            belnr = row.get('BELNR', '').strip()
            werks = row.get('WERKS', '').strip()

            if not activity_date:
                raise ValueError("Posting date (BUDAT) or Document Date (BLDAT) is required.")

            # Run emission calculations
            normalized_qty, factor, co2e, fuel_type, is_valid_unit = calculate_sap_fuel_emissions(
                amount, unit, description, matnr
            )

            # Check if plant code WERKS is unrecognized (mock list of active plants)
            # In a real system we would look this up from a Database.
            # Let's mock that plants must match specific codes like DE01, IN01, US01, PL01, PL02.
            plant_warnings = []
            if werks and werks not in ['DE01', 'IN01', 'US01', 'PL01', 'PL02']:
                plant_warnings.append(f"Unrecognized Plant Code: {werks}")

            # Create Record
            record = EmissionRecord(
                client=client,
                upload=data_upload,
                source_type='SAP',
                scope=1,  # Scope 1 for fuel combustion
                activity_date=activity_date,
                amount=amount,
                unit=unit,
                normalized_amount_kg_co2e=co2e,
                raw_data=row,
                status='PENDING',
                original_data=None,
                is_edited=False
            )

            # Auto Flagging checks
            is_flagged, flag_reason = auto_flag_record(record)
            
            # Append plant warning if any
            if plant_warnings:
                p_warn = " | ".join(plant_warnings)
                record.status = 'FLAGGED'
                record.flag_reason = f"{record.flag_reason} | {p_warn}" if record.flag_reason else p_warn

            record.save()

            # Create initial audit log
            AuditLog.objects.create(
                record=record,
                action='UPLOAD',
                performed_by=user,
                notes=f"Ingested from SAP Flat File: Document {belnr}"
            )

        except Exception as e:
            error_count += 1
            error_log.append({
                "row": idx,
                "error": str(e),
                "raw_values": row
            })

    # Update DataUpload stats
    data_upload.row_count = row_count
    data_upload.error_count = error_count
    data_upload.error_log = error_log
    data_upload.status = 'COMPLETED' if error_count < row_count else 'FAILED'
    data_upload.save()
    return data_upload

def process_utility_upload(client, data_upload, file_content, user):
    """
    Parses utility portal CSV.
    Columns: account_number, meter_id, service_address, billing_period_start, billing_period_end, kwh_consumed, peak_demand_kw, rate_schedule, amount_due, tariff_code
    """
    if isinstance(file_content, bytes):
        text_content = file_content.decode('utf-8-sig')
    else:
        text_content = file_content.read().decode('utf-8-sig')

    f = io.StringIO(text_content)
    reader = csv.DictReader(f)
    
    row_count = 0
    error_count = 0
    error_log = []
    
    required_cols = ['billing_period_end', 'kwh_consumed']
    
    for idx, row in enumerate(reader, start=1):
        row_count += 1
        try:
            missing_cols = [c for c in required_cols if c not in row]
            if missing_cols:
                raise ValueError(f"Missing required columns: {missing_cols}")

            # Parse fields
            raw_end_date = row.get('billing_period_end')
            activity_date = parse_date_value(raw_end_date)
            kwh_raw = row.get('kwh_consumed')
            amount = parse_decimal_value(kwh_raw)
            meter_id = row.get('meter_id', '').strip()
            account_num = row.get('account_number', '').strip()

            if not activity_date:
                raise ValueError("Billing period end date is required.")

            # Calculate emissions
            _, factor, co2e = calculate_utility_electricity_emissions(amount)

            # Create Record
            record = EmissionRecord(
                client=client,
                upload=data_upload,
                source_type='UTILITY',
                scope=2,  # Scope 2 for electricity
                activity_date=activity_date,
                amount=amount,
                unit='kWh',
                normalized_amount_kg_co2e=co2e,
                raw_data=row,
                status='PENDING',
                original_data=None,
                is_edited=False
            )

            # Auto Flagging checks
            auto_flag_record(record)
            record.save()

            # Create audit log
            AuditLog.objects.create(
                record=record,
                action='UPLOAD',
                performed_by=user,
                notes=f"Ingested from Utility CSV: Meter {meter_id}, Account {account_num}"
            )

        except Exception as e:
            error_count += 1
            error_log.append({
                "row": idx,
                "error": str(e),
                "raw_values": row
            })

    data_upload.row_count = row_count
    data_upload.error_count = error_count
    data_upload.error_log = error_log
    data_upload.status = 'COMPLETED' if error_count < row_count else 'FAILED'
    data_upload.save()
    return data_upload

def process_travel_upload(client, data_upload, file_content, user):
    """
    Parses corporate travel CSV (Concur-style).
    Columns: transaction_id, employee_id, travel_date, expense_type, vendor_name, origin_code, destination_code, amount, currency, trip_purpose, booking_class, nights_stayed
    """
    if isinstance(file_content, bytes):
        text_content = file_content.decode('utf-8-sig')
    else:
        text_content = file_content.read().decode('utf-8-sig')

    f = io.StringIO(text_content)
    reader = csv.DictReader(f)
    
    row_count = 0
    error_count = 0
    error_log = []
    
    required_cols = ['travel_date', 'expense_type', 'amount']
    
    for idx, row in enumerate(reader, start=1):
        row_count += 1
        try:
            missing_cols = [c for c in required_cols if c not in row]
            if missing_cols:
                raise ValueError(f"Missing required columns: {missing_cols}")

            # Parse fields
            raw_date = row.get('travel_date')
            activity_date = parse_date_value(raw_date)
            expense_type = row.get('expense_type', '').strip().upper()
            raw_amount = row.get('amount')
            amount = parse_decimal_value(raw_amount)
            origin = row.get('origin_code', '').strip().upper()
            destination = row.get('destination_code', '').strip().upper()
            tx_id = row.get('transaction_id', '').strip()
            
            nights_raw = row.get('nights_stayed')
            nights_stayed = int(float(nights_raw)) if nights_raw and str(nights_raw).strip() != "" else None

            if not activity_date:
                raise ValueError("Travel date is required.")

            # Calculate emissions
            calc_amount, factor, co2e, category, unit, details = calculate_travel_emissions(
                expense_type, origin, destination, amount, nights_stayed
            )

            # Create Record
            record = EmissionRecord(
                client=client,
                upload=data_upload,
                source_type='TRAVEL',
                scope=3,  # Scope 3 for travel
                activity_date=activity_date,
                amount=calc_amount,  # normalized amount (km or room-nights)
                unit=unit,
                normalized_amount_kg_co2e=co2e,
                raw_data=row,
                status='PENDING',
                original_data=None,
                is_edited=False
            )

            # Auto Flagging checks
            is_flagged, flag_reason = auto_flag_record(record)
            
            # If calculation engine returned validation warnings, append them
            if details:
                record.status = 'FLAGGED'
                record.flag_reason = f"{record.flag_reason} | {details}" if record.flag_reason else details

            record.save()

            # Create audit log
            AuditLog.objects.create(
                record=record,
                action='UPLOAD',
                performed_by=user,
                notes=f"Ingested from Corporate Travel: TX {tx_id} ({expense_type})"
            )

        except Exception as e:
            error_count += 1
            error_log.append({
                "row": idx,
                "error": str(e),
                "raw_values": row
            })

    data_upload.row_count = row_count
    data_upload.error_count = error_count
    data_upload.error_log = error_log
    data_upload.status = 'COMPLETED' if error_count < row_count else 'FAILED'
    data_upload.save()
    return data_upload
