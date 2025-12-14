const API_URL = "http://localhost:8000";

export interface BuyTimingRequest {
  item: string;
  start_date: string;
  months_ahead: number;
}

export interface BuyTimingResult {
  best_buy_date: string;
  expected_profit: number;
}

export interface OptimizedDecisionRequest {
  item: string;
  stock: number;
  x: number;
  discount_x: number;
  y: number;
  discount_x_plus_y: number;
  client_id?: string;
  lookback_days?: number;
  horizon_days?: number;
  alpha_observed?: number;
  emergency_days_cover?: number;
}

export type OptimizedDecisionResult = {
  item: string;
  as_of: string;
  decision: "BUY_NOW" | "WAIT" | "HOLD" | "EMERGENCY_BUY";
  reason?: string;
  observed_daily_velocity: number;
  scenarios: any;
};


export async function getBestBuyDate(
  req: BuyTimingRequest
): Promise<BuyTimingResult> {
  const res = await fetch(`${API_URL}/strategy/best-buy-date`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export async function getOptimizedDecision(
  req: OptimizedDecisionRequest
): Promise<OptimizedDecisionResult> {
  const res = await fetch(`${API_URL}/strategy/optimized-decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}
