from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from decimal import Decimal
from datetime import date, timedelta
import io

from emissions.models import Client, DataUpload, EmissionRecord, EmissionFactor, AuditLog
from emissions.services.calculations import (
    haversine_distance, calculate_sap_fuel_emissions,
    calculate_utility_electricity_emissions, calculate_travel_emissions
)
from emissions.services.flagging import auto_flag_record

User = get_user_model()

class CalculationsTest(TestCase):
    def test_haversine_distance(self):
        # DEL to BOM is approx 1140 km
        dist = haversine_distance('DEL', 'BOM')
        self.assertIsNotNone(dist)
        self.assertGreater(dist, 1100)
        self.assertLess(dist, 1200)

        # Missing airport code returns None
        self.assertIsNone(haversine_distance('DEL', 'XYZ'))

    def test_sap_fuel_emissions(self):
        # 100 Liters of Diesel: Factor = 2.68, Total CO2e = 268.0 kg
        qty, factor, co2e, fuel_type, is_valid_unit = calculate_sap_fuel_emissions(
            100, 'L', 'Backup generator diesel fuel'
        )
        self.assertEqual(qty, Decimal('100.0'))
        self.assertEqual(factor, Decimal('2.68'))
        self.assertEqual(co2e, Decimal('268.00'))
        self.assertEqual(fuel_type, 'Diesel')
        self.assertTrue(is_valid_unit)

        # 50 Gallons of Petrol: 50 * 3.78541 = 189.2705 Liters, Factor = 2.31, Total CO2e = 437.214855 kg
        qty, factor, co2e, fuel_type, is_valid = calculate_sap_fuel_emissions(
            50, 'GAL', 'Petrol for sales team cars'
        )
        self.assertAlmostEqual(qty, Decimal('189.2705'))
        self.assertEqual(factor, Decimal('2.31'))
        self.assertTrue(is_valid)

    def test_utility_emissions(self):
        # 1000 kWh: Factor = 0.82, Total CO2e = 820.0 kg
        qty, factor, co2e = calculate_utility_electricity_emissions(1000)
        self.assertEqual(qty, Decimal('1000'))
        self.assertEqual(factor, Decimal('0.82'))
        self.assertEqual(co2e, Decimal('820.00'))

    def test_travel_emissions(self):
        # Flight (Short Haul: DEL to BOM < 1500km)
        qty, factor, co2e, category, unit, details = calculate_travel_emissions('AIRFARE', 'DEL', 'BOM', 0)
        self.assertEqual(category, 'Flight')
        self.assertEqual(unit, 'km')
        self.assertEqual(factor, Decimal('0.255'))
        self.assertGreater(co2e, Decimal('250.0'))

        # Hotel Room (3 nights: 3 * 31.2 = 93.6 kg CO2e)
        qty, factor, co2e, category, unit, details = calculate_travel_emissions('HOTEL', '', '', 0, nights_stayed=3)
        self.assertEqual(category, 'Hotel')
        self.assertEqual(unit, 'room-night')
        self.assertEqual(qty, 3)
        self.assertEqual(factor, Decimal('31.2'))
        self.assertEqual(co2e, Decimal('93.6'))

        # Car Rental (DEL to BOM km * 0.192)
        qty, factor, co2e, category, unit, details = calculate_travel_emissions('CAR', 'DEL', 'BOM', 0)
        self.assertEqual(category, 'Car')
        self.assertEqual(factor, Decimal('0.192'))


class FlaggingTest(TestCase):
    def setUp(self):
        self.client_obj = Client.objects.create(name="Test Client", slug="test-client")
        self.user = User.objects.create_user(username="testuser", password="password")
        self.upload = DataUpload.objects.create(
            client=self.client_obj, source_type='SAP', filename='test.txt', uploaded_by=self.user
        )

    def test_flagging_future_date(self):
        future_date = date.today() + timedelta(days=5)
        record = EmissionRecord(
            client=self.client_obj,
            upload=self.upload,
            source_type='SAP',
            scope=1,
            activity_date=future_date,
            amount=Decimal('10.00'),
            unit='L',
            normalized_amount_kg_co2e=Decimal('26.8'),
            raw_data={},
            status='PENDING'
        )
        is_flagged, reason = auto_flag_record(record)
        self.assertTrue(is_flagged)
        self.assertIn("in the future", reason)
        self.assertEqual(record.status, 'FLAGGED')

    def test_flagging_unrecognized_unit(self):
        record = EmissionRecord(
            client=self.client_obj,
            upload=self.upload,
            source_type='SAP',
            scope=1,
            activity_date=date.today(),
            amount=Decimal('10.00'),
            unit='BAGS',
            normalized_amount_kg_co2e=Decimal('0.0'),
            raw_data={},
            status='PENDING'
        )
        is_flagged, reason = auto_flag_record(record)
        self.assertTrue(is_flagged)
        self.assertIn("Unrecognized SAP unit", reason)
        self.assertEqual(record.status, 'FLAGGED')

    def test_flagging_outlier_detection(self):
        # Create 5 historical approved records with variance (so stddev > 0)
        # Amounts: 25, 26, 27, 28, 29. Mean = 27.0, StdDev = 1.414
        for i in range(5):
            EmissionRecord.objects.create(
                client=self.client_obj,
                upload=self.upload,
                source_type='SAP',
                scope=1,
                activity_date=date.today() - timedelta(days=i),
                amount=Decimal('10.00'),
                unit='L',
                normalized_amount_kg_co2e=Decimal(str(25.0 + i)),
                status='APPROVED',
                raw_data={}
            )

        # Mean = 26.8, StdDev = 0
        # A new record with 1000 kg CO2e is way above mean (26.8) + 3*std_dev
        record = EmissionRecord(
            client=self.client_obj,
            upload=self.upload,
            source_type='SAP',
            scope=1,
            activity_date=date.today(),
            amount=Decimal('500.00'),
            unit='L',
            normalized_amount_kg_co2e=Decimal('1340.00'),  # 500 * 2.68
            raw_data={},
            status='PENDING'
        )
        is_flagged, reason = auto_flag_record(record)
        self.assertTrue(is_flagged)
        self.assertIn("Outlier detected", reason)
        self.assertEqual(record.status, 'FLAGGED')


class APITest(APITestCase):
    def setUp(self):
        self.client_obj = Client.objects.create(name="breatheesg Manufacturing", slug="breatheesg-mfg")
        self.user = User.objects.create_superuser(username="admin", email="admin@breatheesg.com", password="password")
        
        # Get JWT Token
        url = reverse('token_obtain_pair')
        response = self.client.post(url, {'username': 'admin', 'password': 'password'}, format='json')
        self.token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_sap_tsv_upload(self):
        # Construct realistic SAP TSV content
        tsv_data = (
            "MANDT\tBUKRS\tBELNR\tBLDAT\tBUDAT\tLIFNR\tMATNR\tMENGE\tMEINS\tDMBTR\tWAERS\tWERKS\tKOSTL\tBKTXT\n"
            "100\t1000\t10000001\t20260501\t20260501\tVEND01\tMAT01\t150.00\tL\t300.00\tEUR\tDE01\tCOST01\tDiesel fuel for backup gen\n"
        )
        
        file_obj = io.BytesIO(tsv_data.encode('utf-8'))
        file_obj.name = 'sap_export.txt'

        url = reverse('upload-upload-sap')
        response = self.client.post(url, {'file': file_obj}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['row_count'], 1)
        self.assertEqual(response.data['error_count'], 0)

        # Check that records are created
        records = EmissionRecord.objects.filter(source_type='SAP')
        self.assertEqual(records.count(), 1)
        self.assertEqual(records.first().status, 'PENDING')
        self.assertEqual(records.first().normalized_amount_kg_co2e, Decimal('402.00')) # 150 * 2.68
