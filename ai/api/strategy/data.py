import pandas as pd
import pandas as pd
from pathlib import Path

# Project root: PythonProject/
BASE_DIR = Path(__file__).resolve().parents[1]

def load_sales_data(relative_path: str = "app/sales_transactions.csv") -> pd.DataFrame:
    csv_path = BASE_DIR / relative_path

    if not csv_path.exists():
        raise FileNotFoundError(f"Sales CSV not found at: {csv_path}")

    df = pd.read_csv(csv_path)
    df["sold_date"] = pd.to_datetime(df["sold_date"])
    return df


def build_monthly_frame(sales_df: pd.DataFrame) -> pd.DataFrame:
    monthly = (
        sales_df
        .groupby(["item_name", sales_df["sold_date"].dt.to_period("M")])
        .agg(total_quantity=("quantity_sold", "sum"))
        .reset_index()
    )
    monthly["month"] = monthly["sold_date"].dt.month
    monthly["year"] = monthly["sold_date"].dt.year
    return monthly

def get_monthly_feature_columns(monthly_df: pd.DataFrame):
    monthly_encoded = pd.get_dummies(monthly_df, columns=["item_name"])
    X_cols = monthly_encoded.drop(columns=["total_quantity", "sold_date"]).columns
    return X_cols
