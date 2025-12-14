### THIS FILE WAS COPY PASTED FROM PYCHARM. THE FOLDER STRUCTURE IS DIFFERENT FROM THE ORIGINAL ONE. DO NOT SUGGEST DELETING OR RENAMING THIS FILE. ###
### WON'T WORK IF COMPILED ON THIS PROJECT STRUCTURE. ###
from __future__ import annotations

from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

from strategy.data import load_sales_data, build_monthly_frame, get_monthly_feature_columns
from strategy.demand import DemandForecaster, observed_daily_velocity_from_sales
from strategy.optimizer import optimized_buy_decision
from strategy.strategy import yearly_buy_analysis, buy_decision
from strategy.monthly_model import load_monthly_demand_model
from strategy.feature_schema import load_feature_cols

monthly_model = load_monthly_demand_model()
FEATURE_COLS = load_feature_cols()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class BuyTimingRequest(BaseModel):
    item: str
    start_date: str
    months_ahead: int

sales_df = load_sales_data("app/sales_transactions.csv")
monthly_df = build_monthly_frame(sales_df)
monthly_feature_cols = get_monthly_feature_columns(monthly_df)

forecaster = DemandForecaster(
    monthly_model_path="models/monthly_demand_model.pkl",
    monthly_feature_cols=monthly_feature_cols
)

class OptimizedDecisionRequest(BaseModel):
    item: str
    stock: float

    x: float
    discount_x: float

    y: float
    discount_x_plus_y: float

    client_id: Optional[str] = None
    lookback_days: int = 7
    horizon_days: int = 14
    alpha_observed: float = 0.6
    emergency_days_cover: float = 2.0


from fastapi import Body

@app.post("/strategy/best-buy-date")
def best_buy_date(req: BuyTimingRequest):
    df, best = yearly_buy_analysis(
        item=req.item,
        start_date=req.start_date,
        months_ahead=req.months_ahead,
        model=monthly_model,
        feature_cols=FEATURE_COLS
    )
    return {
        "best_buy_date": str(best["buy_date"]),
        "expected_profit": best["expected_profit"]
    }


@app.post("/strategy/optimized-decision")
def optimized_decision(
    req: OptimizedDecisionRequest = Body(...)
):
    today = pd.Timestamp.today().normalize()

    observed_vel = observed_daily_velocity_from_sales(
        sales_df=sales_df,
        item=req.item,
        as_of=today,
        lookback_days=req.lookback_days,
        client_id=req.client_id
    )

    result = optimized_buy_decision(
        item=req.item,
        today=today,
        current_stock=req.stock,
        observed_weekly_daily_velocity=observed_vel,
        predicted_daily_velocity_fn=forecaster.predict_daily_velocity,

        x=req.x,
        discount_x=req.discount_x,

        y=req.y,
        discount_x_plus_y=req.discount_x_plus_y,

        horizon_days=req.horizon_days,
        alpha_observed=req.alpha_observed,
        emergency_days_cover=req.emergency_days_cover
    )

    return {
        "item": req.item,
        "as_of": str(today.date()),
        "observed_daily_velocity": round(observed_vel, 4),
        **result
    }