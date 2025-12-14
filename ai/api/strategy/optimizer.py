import pandas as pd
from .simulator import simulate_plan
from .pricing import supplier_price, retail_price

def blended_velocity_fn(
    predicted_daily_velocity_fn,
    observed_velocity: float,
    alpha_observed: float = 0.6,
):
    """
    Returns a function(item, date)->velocity that blends observed velocity with model prediction.
    alpha_observed=0.6 means rely 60% on observed, 40% on prediction.
    """
    def _fn(item: str, date: pd.Timestamp) -> float:
        pred = float(predicted_daily_velocity_fn(item, date))
        obs = float(observed_velocity)
        return alpha_observed * obs + (1.0 - alpha_observed) * pred
    return _fn

def compute_stockout_penalty_per_unit(item: str, date: pd.Timestamp) -> float:
    """
    Simple penalty: lost gross margin on that day (sell - supplier).
    You can make this more aggressive if stockouts damage relationships.
    """
    return max(0.0, retail_price(item, date) - supplier_price(item, date))

def optimized_buy_decision(
    item: str,
    today: pd.Timestamp,
    current_stock: float,
    observed_weekly_daily_velocity: float,
    predicted_daily_velocity_fn,

    x: float,
    discount_x: float,

    y: float,
    discount_x_plus_y: float,

    horizon_days: int = 14,
    alpha_observed: float = 0.6,
    emergency_days_cover: float = 2.0,
):

    """
    Decision among:
      - EMERGENCY_BUY (if you cannot cover N days of demand)
      - BUY_NOW (3% discount, qty x, immediate)
      - WAIT (10% discount, qty x+y, in 3 days)

    emergency_days_cover: if current stock < emergency_days_cover * expected daily velocity => EMERGENCY
    """
    velocity = blended_velocity_fn(
        predicted_daily_velocity_fn=predicted_daily_velocity_fn,
        observed_velocity=observed_weekly_daily_velocity,
        alpha_observed=alpha_observed,
    )

    expected_daily = velocity(item, today)
    if expected_daily > 0 and current_stock < emergency_days_cover * expected_daily:
        # Emergency scenario: buy NOW but maybe larger (x+y) to reduce repeat emergencies
        penalty = compute_stockout_penalty_per_unit(item, today)
        emergency = simulate_plan(
            item=item,
            start_date=today,
            horizon_days=horizon_days,
            current_stock=current_stock,
            buy_delay_days=0,
            buy_discount=0.03,
            buy_quantity=(x + y),
            predicted_velocity_fn=velocity,
            stockout_penalty_per_unit=penalty,
        )
        return {
            "decision": "EMERGENCY_BUY",
            "reason": f"Stock is below {emergency_days_cover} days of expected demand",
            "scenarios": {"emergency_buy": emergency},
        }

    penalty = compute_stockout_penalty_per_unit(item, today)

    buy_now = simulate_plan(
        item=item,
        start_date=today,
        horizon_days=horizon_days,
        current_stock=current_stock,
        buy_delay_days=0,
        buy_discount=discount_x,
        buy_quantity=x,
        predicted_velocity_fn=velocity,
        stockout_penalty_per_unit=penalty,
    )

    wait_3 = simulate_plan(
        item=item,
        start_date=today,
        horizon_days=horizon_days,
        current_stock=current_stock,
        buy_delay_days=3,
        buy_discount=discount_x_plus_y,
        buy_quantity=(x + y),
        predicted_velocity_fn=velocity,
        stockout_penalty_per_unit=penalty,
    )

    decision = "BUY_NOW" if buy_now["profit"] >= wait_3["profit"] else "WAIT"
    return {
        "decision": decision,
        "scenarios": {
            "buy_now": buy_now,
            "wait_3_days": wait_3,
        }
    }
