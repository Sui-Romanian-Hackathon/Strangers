import numpy as np

HOLDING_COST_PER_DAY = 0.005  # 0.5% per day

def supplier_price(item: str, date):
    base = 0.30

    if date.day >= 25:
        return round(base * 0.80, 2)  # 20% discount

    if date.month == 11:
        return round(base * 0.75, 2)

    if np.random.rand() < 0.03:
        return round(base * 0.70, 2)

    return base

def retail_price(item: str, date):
    base = 0.50

    if date.month == 12:
        return round(base * 1.40, 2)

    if date.month == 4:
        return round(base * 1.25, 2)

    if date.month in [6, 7, 8]:
        return round(base * 1.10, 2)

    return base
