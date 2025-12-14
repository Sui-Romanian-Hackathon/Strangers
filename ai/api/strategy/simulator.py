from __future__ import annotations

import pandas as pd
from strategy.pricing import supplier_price, retail_price, HOLDING_COST_PER_DAY

def simulate_plan(
    item: str,
    start_date: pd.Timestamp,
    horizon_days: int,
    current_stock: float,
    buy_delay_days: int,
    buy_discount: float,
    buy_quantity: float,
    predicted_velocity_fn,
    stockout_penalty_per_unit: Optional[float] = None,
):
    """
    Simulates daily sales for horizon_days.
    - buy happens at day == buy_delay_days (at that day's supplier price * (1-discount))
    - demand is predicted_velocity_fn(item, date)
    - stockouts lose sales; optionally apply penalty per unit (e.g. lost margin)
    """
    stock = float(current_stock)
    total_profit = 0.0
    lost_units = 0.0
    total_revenue = 0.0
    total_cogs = 0.0
    total_holding = 0.0
    total_stockout_penalty = 0.0

    for day in range(horizon_days):
        date = start_date + pd.Timedelta(days=day)

        # Restock on the chosen day
        if day == buy_delay_days and buy_quantity > 0:
            unit_cost = supplier_price(item, date) * (1.0 - buy_discount)
            total_cogs += unit_cost * buy_quantity
            stock += buy_quantity

        demand = float(predicted_velocity_fn(item, date))
        sold = min(stock, demand)
        stock -= sold

        if sold < demand:
            lost = demand - sold
            lost_units += lost
            if stockout_penalty_per_unit is not None:
                total_stockout_penalty += stockout_penalty_per_unit * lost

        sell_price = retail_price(item, date)
        revenue = sold * sell_price
        total_revenue += revenue

        holding_cost = stock * HOLDING_COST_PER_DAY * max(supplier_price(item, date), 0.0001)
        total_holding += holding_cost

    total_profit = total_revenue - total_cogs - total_holding - total_stockout_penalty

    return {
        "profit": round(total_profit, 2),
        "revenue": round(total_revenue, 2),
        "cogs": round(total_cogs, 2),
        "holding_cost": round(total_holding, 2),
        "lost_units": round(lost_units, 2),
        "stockout_penalty": round(total_stockout_penalty, 2),
        "ending_stock": round(stock, 2),
        "buy_delay_days": buy_delay_days,
        "buy_discount": buy_discount,
        "buy_quantity": buy_quantity,
    }
