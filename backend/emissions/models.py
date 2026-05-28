from django.db import models
from django.conf import settings

class Client(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class DataUpload(models.Model):
    SOURCE_CHOICES = [
        ('SAP', 'SAP Flat File'),
        ('UTILITY', 'Utility Portal CSV'),
        ('TRAVEL', 'Corporate Travel CSV'),
    ]
    STATUS_CHOICES = [
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='uploads')
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploads'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    filename = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PROCESSING')
    row_count = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)
    error_log = models.JSONField(null=True, blank=True)  # List of error details: [{"row": 1, "error": "msg"}]

    def __str__(self):
        return f"{self.filename} ({self.source_type})"

class EmissionRecord(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('FLAGGED', 'Flagged'),
    ]
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='emission_records')
    upload = models.ForeignKey(DataUpload, on_delete=models.CASCADE, related_name='records')
    source_type = models.CharField(max_length=20, choices=DataUpload.SOURCE_CHOICES)
    scope = models.IntegerField(choices=[(1, 'Scope 1'), (2, 'Scope 2'), (3, 'Scope 3')])
    activity_date = models.DateField()
    amount = models.DecimalField(max_digits=15, decimal_places=4)
    unit = models.CharField(max_length=20)
    normalized_amount_kg_co2e = models.DecimalField(max_digits=15, decimal_places=4)
    raw_data = models.JSONField()  # Store original row map
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    flag_reason = models.TextField(blank=True, null=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_records'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    is_edited = models.BooleanField(default=False)
    original_data = models.JSONField(null=True, blank=True)  # Snapshot before edits
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.source_type} - Scope {self.scope} - {self.normalized_amount_kg_co2e} kg CO2e"

class AuditLog(models.Model):
    record = models.ForeignKey(EmissionRecord, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=50) # UPLOAD, APPROVE, REJECT, FLAG, EDIT
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.action} on Record {self.record_id} by {self.performed_by}"

class EmissionFactor(models.Model):
    category = models.CharField(max_length=100)      # Fuel, Electricity, Flight, Hotel, Car
    subcategory = models.CharField(max_length=100)   # Diesel, Petrol, India Grid, Short Haul, Long Haul, etc.
    factor_value = models.DecimalField(max_digits=10, decimal_places=5)
    unit = models.CharField(max_length=30)           # kg CO2e/L, kg CO2e/kWh, kg CO2e/km, etc.
    source = models.CharField(max_length=255)
    valid_from = models.DateField(null=True, blank=True)
    valid_to = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.category} ({self.subcategory}): {self.factor_value} {self.unit}"
