
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

sales_df = pd.read_csv("sales_transactions.csv")
inv_df = pd.read_csv("inventory_velocity.csv")

sales_df["sold_date"] = pd.to_datetime(sales_df["sold_date"])
inv_df["date"] = pd.to_datetime(inv_df["date"])

# ============================================================
# MODEL #1 — MONTHLY DEMAND FORECAST
# ============================================================
print("Training monthly demand model...")

monthly = (
    sales_df
    .groupby(["item_name", sales_df["sold_date"].dt.to_period("M")])
    .agg(total_quantity=("quantity_sold", "sum"))
    .reset_index()
)

monthly["month"] = monthly["sold_date"].dt.month
monthly["year"] = monthly["sold_date"].dt.year

monthly_encoded = pd.get_dummies(monthly, columns=["item_name"])

X_monthly = monthly_encoded.drop(columns=["total_quantity", "sold_date"])
y_monthly = monthly_encoded["total_quantity"]

monthly_model = RandomForestRegressor(
    n_estimators=300,
    random_state=42,
    n_jobs=-1
)

monthly_model.fit(X_monthly, y_monthly)
joblib.dump(monthly_model, "models/monthly_demand_model.pkl")

print("Monthly demand model saved.")

# ============================================================
# MODEL #2 — BUY / WAIT / EMERGENCY CLASSIFIER
# ============================================================
print("Training buy decision model...")

def label_decision(row):
    if row["stock_remaining"] < row["daily_customer_demand"] * 2:
        return "EMERGENCY_BUY"
    elif row["stock_remaining"] > row["daily_customer_demand"] * 6:
        return "WAIT"
    else:
        return "BUY_NOW"

inv_df["decision"] = inv_df.apply(label_decision, axis=1)

features = [
    "daily_customer_demand",
    "stock_remaining",
    "holiday_spike"
]

X = inv_df[features]
y = inv_df["decision"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

decision_model = RandomForestClassifier(
    n_estimators=300,
    random_state=42,
    n_jobs=-1
)

decision_model.fit(X_train, y_train)
joblib.dump(decision_model, "models/buy_decision_model.pkl")

print("Buy decision model saved.")
print(classification_report(y_test, decision_model.predict(X_test)))
