import pandas as pd

def load_feature_cols():
    sales_df = pd.read_csv("sales_transactions.csv")
    sales_df["sold_date"] = pd.to_datetime(sales_df["sold_date"])

    monthly = (
        sales_df
        .groupby(["item_name", sales_df["sold_date"].dt.to_period("M")])
        .agg(total_quantity=("quantity_sold", "sum"))
        .reset_index()
    )

    monthly["month"] = monthly["sold_date"].dt.month
    monthly["year"] = monthly["sold_date"].dt.year

    monthly_encoded = pd.get_dummies(monthly, columns=["item_name"])

    return monthly_encoded.drop(
        columns=["total_quantity", "sold_date"]
    ).columns.tolist()
