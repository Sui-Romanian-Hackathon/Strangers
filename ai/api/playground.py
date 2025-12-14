import pandas as pd
import numpy as np
import joblib

sales_df = pd.read_csv("sales_transactions.csv")
sales_df["sold_date"] = pd.to_datetime(sales_df["sold_date"])

monthly_model = joblib.load("models/monthly_demand_model.pkl")
decision_model = joblib.load("models/buy_decision_model.pkl")

monthly = (
    sales_df
    .groupby(["item_name", sales_df["sold_date"].dt.to_period("M")])
    .agg(total_quantity=("quantity_sold", "sum"))
    .reset_index()
)

monthly["month"] = monthly["sold_date"].dt.month
monthly["year"] = monthly["sold_date"].dt.year

monthly_encoded = pd.get_dummies(monthly, columns=["item_name"])
X_monthly_cols = monthly_encoded.drop(columns=["total_quantity", "sold_date"]).columns


def supplier_price(item, date):
    base = 0.30

    if date.day >= 25:
        return round(base * 0.80, 2)  # 20% discount

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

HOLDING_COST_PER_DAY = 0.005  # 0.5% per day


def predict_monthly_demand(item, year, month):
    row = {"month": month, "year": year}
    for col in X_monthly_cols:
        if col.startswith("item_name_"):
            row[col] = int(col == f"item_name_{item}")
    return monthly_model.predict(pd.DataFrame([row]))[0]


def yearly_buy_analysis(item, start_date, months_ahead=6):
    dates = pd.date_range(start_date, periods=months_ahead * 30)

    demand_cache = {}
    for d in dates:
        key = (d.year, d.month)
        if key not in demand_cache:
            demand_cache[key] = predict_monthly_demand(item, d.year, d.month) / 30

    results = []

    for i, buy_date in enumerate(dates):
        if i % 20 == 0:
            print(f"Processing buy date {buy_date.date()} ({i}/{len(dates)})")

        buy_price = supplier_price(item, buy_date)
        total_profit = 0.0

        for future_date in dates[i:i+90]:
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
    X = pd.DataFrame([{
        "daily_customer_demand": daily_demand,
        "stock_remaining": stock,
        "holiday_spike": holiday
    }])
    return decision_model.predict(X)[0]

if __name__ == "__main__":

    print("\n===== YEAR-LONG BUY ANALYSIS =====")
    df, best = yearly_buy_analysis(
        item="Apple",
        start_date="2025-05-01",
        months_ahead=6
    )

    print(df.head(10))
    print("\nBEST BUY DATE:")
    print(best)

    print("\n===== DAILY DECISION TESTS =====")
    print(buy_decision(40, 30, True))
    print(buy_decision(20, 200, False))
