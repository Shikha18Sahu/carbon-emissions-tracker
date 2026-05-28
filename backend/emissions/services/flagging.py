from datetime import date
from django.db.models import Avg, StdDev
from decimal import Decimal

def auto_flag_record(record):
    """
    Checks if an EmissionRecord should be flagged.
    Updates the record's status to 'FLAGGED' and sets flag_reason if any criteria are met.
    Returns: (is_flagged, flag_reason)
    """
    reasons = []

    # 1. Null required fields
    if record.activity_date is None:
        reasons.append("Activity date is null.")
    if record.amount is None or record.amount == Decimal('0.00'):
        reasons.append("Amount is null or zero.")
    if not record.unit:
        reasons.append("Unit is missing or empty.")

    # 2. Date in the future
    if record.activity_date and record.activity_date > date.today():
        reasons.append(f"Activity date {record.activity_date} is in the future.")

    # 3. Unrecognized Unit
    u_upper = record.unit.upper().strip() if record.unit else ""
    if record.source_type == 'SAP':
        if u_upper not in ['L', 'LTR', 'GAL', 'M3']:
            reasons.append(f"Unrecognized SAP unit: '{record.unit}'. Expected L, LTR, GAL, or M3.")
    elif record.source_type == 'UTILITY':
        if u_upper not in ['KWH']:
            reasons.append(f"Unrecognized utility unit: '{record.unit}'. Expected kWh.")
    elif record.source_type == 'TRAVEL':
        if u_upper not in ['KM', 'ROOM-NIGHT', 'NIGHT', 'NIGHTS']:
            reasons.append(f"Unrecognized travel unit: '{record.unit}'. Expected km or room-night.")

    # 4. Outlier detection (3x Standard Deviation above the mean of approved records for the client + source_type)
    # Import the EmissionRecord inside function to avoid circular imports
    from emissions.models import EmissionRecord
    
    # We query all approved records of the same source_type for comparison
    approved_qs = EmissionRecord.objects.filter(
        client=record.client,
        source_type=record.source_type,
        status='APPROVED'
    )
    
    # Run stddev check only if we have at least 5 historical approved records to avoid false positives
    if approved_qs.count() >= 5:
        stats = approved_qs.aggregate(
            mean=Avg('normalized_amount_kg_co2e'),
            stddev=StdDev('normalized_amount_kg_co2e')
        )
        mean = stats['mean']
        stddev = stats['stddev']
        
        if mean is not None and stddev is not None and stddev > 0:
            mean_dec = Decimal(str(mean))
            stddev_dec = Decimal(str(stddev))
            threshold = mean_dec + (Decimal('3.0') * stddev_dec)
            if record.normalized_amount_kg_co2e > threshold:
                reasons.append(
                    f"Outlier detected: Normalized amount ({record.normalized_amount_kg_co2e:.2f} kg CO2e) is 3x standard deviation above the approved average ({mean_dec:.2f} ± {stddev_dec:.2f} kg CO2e)."
                )

    if reasons:
        record.status = 'FLAGGED'
        record.flag_reason = " | ".join(reasons)
        return True, record.flag_reason

    return False, ""
