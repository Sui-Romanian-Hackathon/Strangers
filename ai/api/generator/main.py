"""
Synthetic data generator for:
1) Store sales transactions (20,000+ rows, 5 years)
2) Customer demand & inventory snapshots with seasonality & price spikes

Includes realistic holiday price & demand spikes:
- Christmas
- Easter
- Black Friday
- New Year

Designed for ML training (demand forecasting, replenishment planning, profit optimization)
"""

import random
import uuid
from datetime import datetime, timedelta
import pandas as pd

# ----------------------------
# CONFIGURATION
# ----------------------------
NUM_SALES = 20_000
NUM_CUSTOMERS = 800
START_DATE = datetime(2020, 1, 1)
END_DATE = datetime(2024, 12, 31)

ITEM_CATALOG = {
    # Fruits
    "Apple": {"category": "Fruits", "cost": 0.30, "price_range": (0.45, 0.65)},
    "Banana": {"category": "Fruits", "cost": 0.20, "price_range": (0.35, 0.55)},
    "Orange": {"category": "Fruits", "cost": 0.35, "price_range": (0.55, 0.80)},
    "Grapes": {"category": "Fruits", "cost": 1.20, "price_range": (1.8, 2.6)},
    "Strawberry": {"category": "Fruits", "cost": 1.50, "price_range": (2.2, 3.0)},

    # Vegetables
    "Tomato": {"category": "Vegetables", "cost": 0.40, "price_range": (0.7, 1.1)},
    "Potato": {"category": "Vegetables", "cost": 0.25, "price_range": (0.45, 0.75)},
    "Onion": {"category": "Vegetables", "cost": 0.30, "price_range": (0.5, 0.9)},
    "Carrot": {"category": "Vegetables", "cost": 0.20, "price_range": (0.4, 0.7)},
    "Broccoli": {"category": "Vegetables", "cost": 0.80, "price_range": (1.3, 2.0)},

    # Dairy
    "Milk": {"category": "Dairy", "cost": 0.90, "price_range": (1.2, 1.7)},
    "Cheese": {"category": "Dairy", "cost": 2.50, "price_range": (3.5, 5.0)},
    "Butter": {"category": "Dairy", "cost": 1.80, "price_range": (2.6, 3.6)},
    "Yogurt": {"category": "Dairy", "cost": 0.60, "price_range": (0.9, 1.4)},
    "Eggs": {"category": "Dairy", "cost": 1.50, "price_range": (2.2, 3.0)},

    # Bakery
    "Bread": {"category": "Bakery", "cost": 0.80, "price_range": (1.1, 1.6)},
    "Croissant": {"category": "Bakery", "cost": 0.90, "price_range": (1.5, 2.4)},
    "Bagel": {"category": "Bakery", "cost": 0.70, "price_range": (1.2, 2.0)},
    "Muffin": {"category": "Bakery", "cost": 0.85, "price_range": (1.4, 2.2)},
    "Cake": {"category": "Bakery", "cost": 5.00, "price_range": (7.5, 12.0)},

    # Meat
    "Chicken Breast": {"category": "Meat", "cost": 3.00, "price_range": (4.5, 6.5)},
    "Beef Steak": {"category": "Meat", "cost": 6.00, "price_range": (9.0, 14.0)},
    "Pork Chop": {"category": "Meat", "cost": 4.00, "price_range": (6.0, 9.0)},
    "Sausage": {"category": "Meat", "cost": 2.50, "price_range": (3.8, 5.8)},
    "Bacon": {"category": "Meat", "cost": 3.50, "price_range": (5.5, 8.0)},

    # Pantry
    "Rice": {"category": "Pantry", "cost": 1.00, "price_range": (1.6, 2.4)},
    "Pasta": {"category": "Pantry", "cost": 0.90, "price_range": (1.4, 2.2)},
    "Flour": {"category": "Pantry", "cost": 0.70, "price_range": (1.1, 1.8)},
    "Sugar": {"category": "Pantry", "cost": 0.60, "price_range": (1.0, 1.6)},
    "Salt": {"category": "Pantry", "cost": 0.20, "price_range": (0.4, 0.7)},

    # Beverages
    "Coffee": {"category": "Beverages", "cost": 3.00, "price_range": (4.5, 7.0)},
    "Tea": {"category": "Beverages", "cost": 2.00, "price_range": (3.0, 5.0)},
    "Orange Juice": {"category": "Beverages", "cost": 1.50, "price_range": (2.3, 3.6)},
    "Soda": {"category": "Beverages", "cost": 0.70, "price_range": (1.2, 2.0)},
    "Water": {"category": "Beverages", "cost": 0.25, "price_range": (0.6, 1.0)},

    # Household
    "Paper Towels": {"category": "Household", "cost": 2.50, "price_range": (3.8, 5.5)},
    "Toilet Paper": {"category": "Household", "cost": 3.00, "price_range": (4.8, 6.8)},
    "Dish Soap": {"category": "Household", "cost": 1.20, "price_range": (2.0, 3.2)},
    "Laundry Detergent": {"category": "Household", "cost": 5.00, "price_range": (7.5, 11.0)},
    "Trash Bags": {"category": "Household", "cost": 2.00, "price_range": (3.2, 5.0)},
}

HOLIDAYS = {
    "christmas": lambda y: (datetime(y, 12, 20), datetime(y, 12, 26)),
    "black_friday": lambda y: (datetime(y, 11, 25), datetime(y, 11, 30)),
    "new_year": lambda y: (datetime(y, 12, 30), datetime(y + 1, 1, 3)),
    "easter": lambda y: (datetime(y, 4, 5), datetime(y, 4, 12)),
}

# ----------------------------
# HELPERS
# ----------------------------
def random_date(start, end):
    return start + timedelta(days=random.randint(0, (end - start).days))


def is_holiday_spike(date):
    for _, fn in HOLIDAYS.items():
        start, end = fn(date.year)
        if start <= date <= end:
            return True
    return False

# ----------------------------
# DATASET 1: SALES TRANSACTIONS
# ----------------------------
sales_data = []

for _ in range(NUM_SALES):
    item = random.choice(list(ITEM_CATALOG.keys()))
    meta = ITEM_CATALOG[item]

    sold_date = random_date(START_DATE, END_DATE)
    holiday = is_holiday_spike(sold_date)

    price_multiplier = random.uniform(1.15, 1.35) if holiday else random.uniform(0.95, 1.05)
    base_price = random.uniform(*meta["price_range"])
    sold_price = round(base_price * price_multiplier, 2)

    quantity = random.randint(2, 15 if holiday else 8)

    sales_data.append({
        "transaction_id": str(uuid.uuid4()),
        "item_name": item,
        "category": meta["category"],
        "quantity_sold": quantity,
        "unit_cost": meta["cost"],
        "unit_price": sold_price,
        "profit": round((sold_price - meta["cost"]) * quantity, 2),
        "sold_date": sold_date.strftime("%Y-%m-%d"),
        "year": sold_date.year,
        "month": sold_date.month,
        "day_of_week": sold_date.weekday(),
        "holiday_spike": holiday
    })

sales_df = pd.DataFrame(sales_data)
sales_df.to_csv("sales_transactions.csv", index=False)

# ----------------------------
# DATASET 2: INVENTORY & VELOCITY
# ----------------------------
inventory_data = []

for item, meta in ITEM_CATALOG.items():
    stock = random.randint(300, 600)

    for day in pd.date_range(START_DATE, END_DATE):
        holiday = is_holiday_spike(day)
        base_demand = random.gauss(25, 6)
        demand_multiplier = random.uniform(1.4, 1.8) if holiday else random.uniform(0.8, 1.1)
        daily_demand = max(0, int(base_demand * demand_multiplier))

        stock -= daily_demand
        stock = max(stock, 0)

        inventory_data.append({
            "item_name": item,
            "category": meta["category"],
            "date": day.strftime("%Y-%m-%d"),
            "daily_customer_demand": daily_demand,
            "stock_remaining": stock,
            "holiday_spike": holiday,
            "restock_trigger": stock < 80
        })

        if stock < 80:
            stock += random.randint(300, 600)

inventory_df = pd.DataFrame(inventory_data)
inventory_df.to_csv("inventory_velocity.csv", index=False)

print("Generated datasets with 5-year seasonality & holiday spikes:")
print("- sales_transactions.csv")
print("- inventory_velocity.csv")
