from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from emissions.models import Client, EmissionFactor
from datetime import date

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds default client, default admin user, and default emission factors'

    def handle(self, *args, **options):
        self.stdout.write("Seeding database...")

        # 1. Seed Client
        client, created = Client.objects.get_or_create(
            slug='breatheesg-mfg',
            defaults={
                'name': 'breatheesg Manufacturing',
                'is_active': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created Client: {client.name}"))
        else:
            self.stdout.write(f"Client already exists: {client.name}")

        # 2. Seed Admin User
        admin_email = 'admin@breatheesg.com'
        admin_username = 'admin'
        if not User.objects.filter(username=admin_username).exists():
            admin_user = User.objects.create_superuser(
                username=admin_username,
                email=admin_email,
                password='password123'
            )
            self.stdout.write(self.style.SUCCESS(f"Created superuser: {admin_username} / password123"))
        else:
            self.stdout.write(f"Superuser already exists: {admin_username}")

        # 3. Seed Emission Factors
        factors = [
            # Scope 1 - Fuel
            {
                'category': 'Fuel',
                'subcategory': 'Diesel',
                'factor_value': 2.68,
                'unit': 'kg CO2e/L',
                'source': 'IPCC 2023',
                'valid_from': date(2023, 1, 1),
                'valid_to': date(2026, 12, 31),
            },
            {
                'category': 'Fuel',
                'subcategory': 'Petrol',
                'factor_value': 2.31,
                'unit': 'kg CO2e/L',
                'source': 'IPCC 2023',
                'valid_from': date(2023, 1, 1),
                'valid_to': date(2026, 12, 31),
            },
            # Scope 2 - Electricity
            {
                'category': 'Electricity',
                'subcategory': 'India Grid',
                'factor_value': 0.82,
                'unit': 'kg CO2e/kWh',
                'source': 'CEA India 2023',
                'valid_from': date(2023, 1, 1),
                'valid_to': date(2026, 12, 31),
            },
            # Scope 3 - Travel
            {
                'category': 'Flight',
                'subcategory': 'Short Haul',
                'factor_value': 0.255,
                'unit': 'kg CO2e/km',
                'source': 'IPCC 2023',
                'valid_from': date(2023, 1, 1),
                'valid_to': date(2026, 12, 31),
            },
            {
                'category': 'Flight',
                'subcategory': 'Long Haul',
                'factor_value': 0.195,
                'unit': 'kg CO2e/km',
                'source': 'IPCC 2023',
                'valid_from': date(2023, 1, 1),
                'valid_to': date(2026, 12, 31),
            },
            {
                'category': 'Hotel',
                'subcategory': 'Hotel Room',
                'factor_value': 31.2,
                'unit': 'kg CO2e/night',
                'source': 'IPCC 2023',
                'valid_from': date(2023, 1, 1),
                'valid_to': date(2026, 12, 31),
            },
            {
                'category': 'Car',
                'subcategory': 'Rental Car',
                'factor_value': 0.192,
                'unit': 'kg CO2e/km',
                'source': 'IPCC 2023',
                'valid_from': date(2023, 1, 1),
                'valid_to': date(2026, 12, 31),
            },
            {
                'category': 'Rail',
                'subcategory': 'Rail Trip',
                'factor_value': 0.041,
                'unit': 'kg CO2e/km',
                'source': 'DEFRA 2023',
                'valid_from': date(2023, 1, 1),
                'valid_to': date(2026, 12, 31),
            },
        ]

        for factor_data in factors:
            factor, created = EmissionFactor.objects.update_or_create(
                category=factor_data['category'],
                subcategory=factor_data['subcategory'],
                defaults=factor_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created factor: {factor.category} ({factor.subcategory})"))
            else:
                self.stdout.write(f"Updated factor: {factor.category} ({factor.subcategory})")

        self.stdout.write(self.style.SUCCESS("Database seeding completed!"))
