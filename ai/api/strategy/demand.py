import joblib
import pandas as pd

from pathlib import Path
import joblib

BASE_DIR = Path(__file__).resolve().parents[1]  

class DemandForecaster:
    def __init__(self, monthly_model_path: str, monthly_feature_cols):
        model_path = BASE_DIR / monthly_model_path
        self.model = joblib.load(model_path)
        self.monthly_feature_cols = monthly_feature_cols


    def predict_monthly_demand(self, item: str, year: int, month: int) -> float:
        row = {"month": month, "year": year}
        for col in self.monthly_feature_cols:
            if col.startswith("item_name_"):
                row[col] = int(col == f"item_name_{item}")
        X = pd.DataFrame([row])
        return float(self.model.predict(X)[0])

    def predict_daily_velocity(self, item: str, date: pd.Timestamp) -> float:
        monthly = self.predict_monthly_demand(item, date.year, date.month)
        return monthly / 30.0


from typing import Optional
import pandas as pd

def observed_daily_velocity_from_sales(
    sales_df: pd.DataFrame,
    item: str,
    as_of: pd.Timestamp,
    lookback_days: int = 7,
    client_id: Optional[str] = None,
    client_col: str = "client_id",
) -> float:

    """
    Uses historical sales to compute *observed* daily velocity for the recent period.
    If client_id is provided, filters to that client; otherwise overall item velocity.
    """
    start = as_of - pd.Timedelta(days=lookback_days)
    df = sales_df[(sales_df["item_name"] == item)]
    df = df[(df["sold_date"] >= start) & (df["sold_date"] <= as_of)]

    if client_id is not None and client_col in df.columns:
        df = df[df[client_col] == client_id]

    qty = df["quantity_sold"].sum() if len(df) else 0.0
    return float(qty) / float(lookback_days)
