import pandas as pd
import numpy as np
import joblib

HOLDING_COST_PER_DAY = 0.005

def supplier_price(item, date):
    base = 0.30
    if date.day >= 25:
        return round(base * 0.80, 2)
    if date.month == 11:
        return round(base * 0.75, 2)
    if np.random.rand() < 0.03:
        return round(base * 0.70, 2)
    return base

def retail_price(item, date):
    base = 0.50
    if date.month == 12:
        return round(base * 1.40, 2)
    if date.month == 4:
        return round(base * 1.25, 2)
    if date.month in [6, 7, 8]:
        return round(base * 1.10, 2)
    return base

def predict_monthly_demand(item, year, month, model, feature_cols):
    row = {"month": month, "year": year}
    for col in feature_cols:
        if col.startswith("item_name_"):
            row[col] = int(col == f"item_name_{item}")

    return model.predict(pd.DataFrame([row]))[0]


def yearly_buy_analysis(item, start_date, months_ahead, model, feature_cols):
    dates = pd.date_range(start_date, periods=months_ahead * 30)

    demand_cache = {}

    for d in dates:
        key = (d.year, d.month)
        if key not in demand_cache:
            monthly = predict_monthly_demand(
                item=item,
                year=d.year,
                month=d.month,
                model=model,
                feature_cols=feature_cols
            )
            demand_cache[key] = monthly / 30

    results = []

    for i, buy_date in enumerate(dates):
        buy_price = supplier_price(item, buy_date)
        total_profit = 0.0

        for future_date in dates[i:i + 90]:
            sell_price = retail_price(item, future_date)
            holding_days = (future_date - buy_date).days
            holding_cost = holding_days * HOLDING_COST_PER_DAY * buy_price

            margin = sell_price - buy_price - holding_cost
            if margin <= 0:
                continue

            daily_demand = demand_cache[(future_date.year, future_date.month)]
            total_profit += margin * daily_demand

        results.append({
            "buy_date": buy_date.date(),
            "expected_profit": round(total_profit, 2)
        })

    df = pd.DataFrame(results)
    best = df.loc[df["expected_profit"].idxmax()]
    return df, best

def buy_decision(daily_demand, stock, holiday):
    return decision_model.predict(pd.DataFrame([{
        "daily_customer_demand": daily_demand,
        "stock_remaining": stock,
        "holiday_spike": holiday
    }]))[0]
