import math
from decimal import Decimal

# Predefined coordinates database for common IATA airport codes
AIRPORT_COORDINATES = {
    'DEL': (28.5562, 77.1000),   # New Delhi
    'BOM': (19.0896, 72.8656),   # Mumbai
    'BLR': (13.1986, 77.7066),   # Bengaluru
    'MAA': (12.9941, 80.1803),   # Chennai
    'CCU': (22.6547, 88.4467),   # Kolkata
    'HYD': (17.2403, 78.4294),   # Hyderabad
    'COK': (10.1520, 76.4019),   # Cochin
    'DXB': (25.2532, 55.3657),   # Dubai
    'LHR': (51.4700, -0.4543),   # London Heathrow
    'CDG': (49.0097, 2.5479),    # Paris CDG
    'SIN': (1.3644, 103.9915),   # Singapore
    'JFK': (40.6398, -73.7789),  # New York JFK
    'LAX': (33.9416, -118.4085), # Los Angeles
    'SFO': (37.6213, -122.3790), # San Francisco
    'ORD': (41.9742, -87.9073),  # Chicago O'Hare
    'FRA': (50.0333, 8.5705),    # Frankfurt
    'HND': (35.5494, 139.7798),  # Tokyo Haneda
    'SYD': (-33.9461, 151.1772), # Sydney
    'AMS': (52.3105, 4.7683),    # Amsterdam Schiphol
    'HKG': (22.3080, 113.9185),  # Hong Kong
}

def haversine_distance(code1, code2):
    """
    Calculate the great-circle distance between two IATA airport codes using Haversine formula.
    Returns distance in kilometers. Returns None if airport code is not in database.
    """
    c1 = code1.upper().strip() if code1 else ""
    c2 = code2.upper().strip() if code2 else ""

    if c1 not in AIRPORT_COORDINATES or c2 not in AIRPORT_COORDINATES:
        return None

    lat1, lon1 = AIRPORT_COORDINATES[c1]
    lat2, lon2 = AIRPORT_COORDINATES[c2]

    # Convert coordinates to radians
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    # Apply haversine formula
    a = math.sin(dphi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    # Radius of earth is 6371 km
    distance_km = 6371.0 * c
    return distance_km

# Conversion rules for SAP Fuel Units to Liters
SAP_UNIT_TO_LITER_MULTIPLIERS = {
    'L': Decimal('1.0'),
    'LTR': Decimal('1.0'),
    'GAL': Decimal('3.78541'),  # US gallon
    'M3': Decimal('1000.0'),    # Cubic meter
}

def calculate_sap_fuel_emissions(quantity, unit, description, mat_number=""):
    """
    Calculates Scope 1 fuel emissions.
    Diesel factor: 2.68 kg CO2e / Liter
    Petrol factor: 2.31 kg CO2e / Liter
    
    Returns: (normalized_qty_liters, factor_value, normalized_co2e, fuel_type, is_valid_unit)
    """
    qty = Decimal(str(quantity))
    u_upper = str(unit).upper().strip()
    desc_upper = (str(description) + " " + str(mat_number)).upper()

    # Determine Fuel Type
    if 'DIESEL' in desc_upper or 'HEATING OIL' in desc_upper or 'DIES' in desc_upper:
        fuel_type = 'Diesel'
        factor = Decimal('2.68')
    elif 'PETROL' in desc_upper or 'GASOLINE' in desc_upper or 'BENZIN' in desc_upper:
        fuel_type = 'Petrol'
        factor = Decimal('2.31')
    else:
        fuel_type = 'Unknown'
        factor = Decimal('0.00')

    # Convert to Liters
    if u_upper in SAP_UNIT_TO_LITER_MULTIPLIERS:
        normalized_qty = qty * SAP_UNIT_TO_LITER_MULTIPLIERS[u_upper]
        is_valid_unit = True
        co2e = normalized_qty * factor
    else:
        normalized_qty = qty
        is_valid_unit = False
        co2e = Decimal('0.00')

    return normalized_qty, factor, co2e, fuel_type, is_valid_unit

def calculate_utility_electricity_emissions(kwh_consumed):
    """
    Calculates Scope 2 utility emissions.
    India Grid factor: 0.82 kg CO2e / kWh
    
    Returns: (kwh_consumed, factor_value, normalized_co2e)
    """
    qty = Decimal(str(kwh_consumed))
    factor = Decimal('0.82')
    co2e = qty * factor
    return qty, factor, co2e

def calculate_travel_emissions(expense_type, origin, destination, amount, nights_stayed=None):
    """
    Calculates Scope 3 Travel emissions.
    - Flight (AIRFARE): Haversine distance. 
      Short haul (<1500km): 0.255 kg CO2e/km/passenger
      Long haul (>=1500km): 0.195 kg CO2e/km/passenger
    - Hotel: 31.2 kg CO2e/room/night. Amount = nights_stayed.
    - Car Rental: 0.192 kg CO2e/km. Amount = haversine distance.
    - Rail: 0.041 kg CO2e/km.
    
    Returns: (calculated_amount, factor_value, normalized_co2e, category, unit, details)
    """
    exp_upper = str(expense_type).upper().strip()
    details = ""

    if exp_upper == 'AIRFARE':
        distance = haversine_distance(origin, destination)
        if distance is None:
            # Fallback to default flight distance and return indicator
            distance = 1200.0
            details = "IATA coordinates missing. Used default 1200km distance."
        
        factor = Decimal('0.255') if distance < 1500.0 else Decimal('0.195')
        co2e = Decimal(str(distance)) * factor
        return Decimal(str(distance)), factor, co2e, 'Flight', 'km', details

    elif exp_upper == 'HOTEL':
        # Use nights stayed if provided, else fallback to standard amount field
        nights = nights_stayed if nights_stayed is not None else amount
        try:
            nights_val = int(float(nights))
        except (ValueError, TypeError):
            nights_val = 1
            details = "Invalid nights_stayed value. Fallback to 1."
        
        factor = Decimal('31.2')
        co2e = Decimal(nights_val) * factor
        return Decimal(nights_val), factor, co2e, 'Hotel', 'room-night', details

    elif exp_upper == 'CAR':
        distance = haversine_distance(origin, destination)
        if distance is None:
            # Try to read distance from amount if it was passed, or fallback
            try:
                distance = float(amount)
                details = "IATA coordinates missing. Used amount as km."
            except (ValueError, TypeError):
                distance = 100.0
                details = "IATA coordinates missing. Used default 100km distance."

        factor = Decimal('0.192')
        co2e = Decimal(str(distance)) * factor
        return Decimal(str(distance)), factor, co2e, 'Car', 'km', details

    elif exp_upper == 'RAIL':
        distance = haversine_distance(origin, destination)
        if distance is None:
            try:
                distance = float(amount)
                details = "IATA coordinates missing. Used amount as km."
            except (ValueError, TypeError):
                distance = 150.0
                details = "IATA coordinates missing. Used default 150km distance."

        factor = Decimal('0.041')
        co2e = Decimal(str(distance)) * factor
        return Decimal(str(distance)), factor, co2e, 'Rail', 'km', details

    else:
        # Unknown expense type
        return Decimal('0.00'), Decimal('0.00'), Decimal('0.00'), 'Unknown', 'N/A', "Unsupported travel expense type."
