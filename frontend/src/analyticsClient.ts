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

export interface DailyDecisionRequest {
  daily_demand: number;
  stock: number;
  holiday: boolean;
}

export interface DailyDecisionResult {
  action: string;
}

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

export async function getDailyDecision(
  req: DailyDecisionRequest
): Promise<DailyDecisionResult> {
  const res = await fetch(`${API_URL}/strategy/daily-decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}
