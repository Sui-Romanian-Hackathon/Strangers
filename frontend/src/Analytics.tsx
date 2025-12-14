import { useState } from "react";
import { Box, Button, Heading, Text, Card, TextField } from "@radix-ui/themes";
import { getBestBuyDate, getOptimizedDecision } from "./analyticsClient";
import type { BuyTimingResult, OptimizedDecisionResult } from "./analyticsClient";

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<"timing" | "optimized">("timing");

  // Buy Timing State
  const [timingItem, setTimingItem] = useState("");
  const [startDate, setStartDate] = useState("");
  const [monthsAhead, setMonthsAhead] = useState("3");
  const [timingLoading, setTimingLoading] = useState(false);
  const [timingResult, setTimingResult] = useState<BuyTimingResult | null>(null);
  const [timingError, setTimingError] = useState<string | null>(null);

  // Optimized Decision State
  const [optItem, setOptItem] = useState("");
  const [stock, setStock] = useState("50");
  const [x, setX] = useState("10");
  const [discountX, setDiscountX] = useState("0.1");
  const [y, setY] = useState("20");
  const [discountXPlusY, setDiscountXPlusY] = useState("0.2");
  const [clientId, setClientId] = useState("");
  const [lookbackDays, setLookbackDays] = useState("7");
  const [horizonDays, setHorizonDays] = useState("14");
  const [alphaObserved, setAlphaObserved] = useState("0.6");
  const [emergencyDaysCover, setEmergencyDaysCover] = useState("2.0");
  const [optLoading, setOptLoading] = useState(false);
  const [optResult, setOptResult] = useState<OptimizedDecisionResult | null>(null);
  const [optError, setOptError] = useState<string | null>(null);

  async function handleBestBuyDate() {
    if (!timingItem || !startDate) {
      setTimingError("Please fill in all fields");
      return;
    }

    setTimingLoading(true);
    setTimingError(null);
    try {
      const result = await getBestBuyDate({
        item: timingItem,
        start_date: startDate,
        months_ahead: parseInt(monthsAhead) || 3,
      });
      setTimingResult(result);
    } catch (err) {
      setTimingError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setTimingLoading(false);
    }
  }

  async function handleOptimizedDecision() {
    if (!optItem) {
      setOptError("Please enter an item name");
      return;
    }

    setOptLoading(true);
    setOptError(null);
    try {
      const result = await getOptimizedDecision({
        item: optItem,
        stock: parseFloat(stock) || 0,
        x: parseFloat(x) || 0,
        discount_x: parseFloat(discountX) || 0,
        y: parseFloat(y) || 0,
        discount_x_plus_y: parseFloat(discountXPlusY) || 0,
        client_id: clientId || undefined,
        lookback_days: parseInt(lookbackDays) || 7,
        horizon_days: parseInt(horizonDays) || 14,
        alpha_observed: parseFloat(alphaObserved) || 0.6,
        emergency_days_cover: parseFloat(emergencyDaysCover) || 2.0,
      });
      setOptResult(result);
    } catch (err) {
      setOptError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setOptLoading(false);
    }
  }

  return (
    <Box>
      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button
          className={`nav-btn ${activeTab === "timing" ? "primary" : ""}`}
          onClick={() => setActiveTab("timing")}
        >
          Best Buy Timing
        </button>
        <button
          className={`nav-btn ${activeTab === "optimized" ? "primary" : ""}`}
          onClick={() => setActiveTab("optimized")}
          style={{
            borderRadius: "7px",            
            border: "1px solid rgb(229, 231, 235)"
          }}
        >
          Optimized Decision
        </button>
      </div>

      {/* Best Buy Timing Model */}
      {activeTab === "timing" && (
        <Box style={{ maxWidth: "600px", margin: "0 auto" }}>
          <Card
            style={{
              padding: 24,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
            }}
          >
            <Heading size="2" mb="4">
              Best Buy Date Strategy
            </Heading>
            <Text color="gray" size="2" style={{ marginBottom: 16 }}>
              Analyze historical data to find the optimal time to buy items
            </Text>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <Text weight="bold" size="2" style={{ marginBottom: 6 }}>
                  Item Name
                </Text>
                <TextField.Root
                  value={timingItem}
                  onChange={(e) => setTimingItem(e.target.value)}
                  placeholder="e.g., Apple, Orange, Milk"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <Text weight="bold" size="2" style={{ marginBottom: 6 }}>
                  Start Date
                </Text>
                <TextField.Root
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  type="date"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <Text weight="bold" size="2" style={{ marginBottom: 6 }}>
                  Months Ahead ({monthsAhead})
                </Text>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={monthsAhead}
                  onChange={(e) => setMonthsAhead(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              {timingError && (
                <div
                  style={{
                    padding: 12,
                    backgroundColor: "#fee2e2",
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    color: "#991b1b",
                    fontSize: 14,
                  }}
                >
                  {timingError}
                </div>
              )}

              <Button
                onClick={handleBestBuyDate}
                disabled={timingLoading}
                style={{ width: "100%", backgroundColor: "#0f172a" }}
              >
                {timingLoading ? "Analyzing..." : "Analyze Timing"}
              </Button>

              {timingResult && (
                <div
                  style={{
                    padding: 16,
                    backgroundColor: "#ecfdf5",
                    border: "2px solid #10b981",
                    borderRadius: 8,
                  }}
                >
                  <Text weight="bold" size="2" style={{ color: "#047857" }}>
                    ✅ Recommendation
                  </Text>
                  <div style={{ marginTop: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                      }}
                    >
                      <Text size="2">Best Buy Date:</Text>
                      <Text weight="bold" size="2" style={{ color: "#047857" }}>
                        {timingResult.best_buy_date}
                      </Text>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        borderTop: "1px solid #d1fae5",
                      }}
                    >
                      <Text size="2">Expected Profit:</Text>
                      <Text weight="bold" size="2" style={{ color: "#059669" }}>
                        ${(timingResult.expected_profit || 0).toFixed(2)}
                      </Text>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </Box>
      )}

      {/* Optimized Decision Model */}
      {activeTab === "optimized" && (
        <Box style={{ maxWidth: "700px", margin: "0 auto" }}>
          <Card
            style={{
              padding: 24,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
            }}
          >
            <Heading size="2" mb="4">
              Optimized Buy/Hold Decision
            </Heading>
            <Text color="gray" size="2" style={{ marginBottom: 16 }}>
              Get AI-driven recommendations based on inventory, pricing tiers, and demand forecasts
            </Text>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <Text weight="bold" size="2" style={{ marginBottom: 6 }}>
                  Item Name
                </Text>
                <TextField.Root
                  value={optItem}
                  onChange={(e) => setOptItem(e.target.value)}
                  placeholder="e.g., Apple, Orange, Milk"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <Text weight="bold" size="2" style={{ marginBottom: 6 }}>
                  Current Stock
                </Text>
                <TextField.Root
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  type="number"
                  placeholder="e.g., 50"
                  style={{ width: "100%" }}
                />
              </div>

              {/* Pricing Tier 1 */}
              <div style={{ padding: 12, backgroundColor: "#f9fafb", borderRadius: 8 }}>
                <Text weight="bold" size="2" style={{ marginBottom: 8 }}>
                  Pricing Tier 1 
                </Text>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <Text size="2" style={{ marginBottom: 4 }}>Quantity (X)</Text>
                    <TextField.Root
                      value={x}
                      onChange={(e) => setX(e.target.value)}
                      type="number"
                      placeholder="10"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <Text size="2" style={{ marginBottom: 4 }}>Discount at X</Text>
                    <TextField.Root
                      value={discountX}
                      onChange={(e) => setDiscountX(e.target.value)}
                      type="number"
                      step="0.01"
                      placeholder="0.1"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>

              {/* Pricing Tier 2 */}
              <div style={{ padding: 12, backgroundColor: "#f9fafb", borderRadius: 8 }}>
                <Text weight="bold" size="2" style={{ marginBottom: 8 }}>
                  Pricing Tier 2
                </Text>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <Text size="2" style={{ marginBottom: 4 }}>Additional Quantity (Y)</Text>
                    <TextField.Root
                      value={y}
                      onChange={(e) => setY(e.target.value)}
                      type="number"
                      placeholder="20"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <Text size="2" style={{ marginBottom: 4 }}>Discount at X+Y</Text>
                    <TextField.Root
                      value={discountXPlusY}
                      onChange={(e) => setDiscountXPlusY(e.target.value)}
                      type="number"
                      step="0.01"
                      placeholder="0.2"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Parameters - Collapsible */}
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer", fontWeight: "bold", fontSize: 14, padding: 8 }}>
                  Advanced Parameters (optional)
                </summary>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12, padding: 12, backgroundColor: "#fafafa", borderRadius: 8 }}>
                  <div>
                    <Text size="2" style={{ marginBottom: 4 }}>Client ID (optional)</Text>
                    <TextField.Root
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="Leave empty for all clients"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <Text size="2" style={{ marginBottom: 4 }}>Lookback Days</Text>
                      <TextField.Root
                        value={lookbackDays}
                        onChange={(e) => setLookbackDays(e.target.value)}
                        type="number"
                        placeholder="7"
                        style={{ width: "100%" }}
                      />
                    </div>
                    <div>
                      <Text size="2" style={{ marginBottom: 4 }}>Horizon Days</Text>
                      <TextField.Root
                        value={horizonDays}
                        onChange={(e) => setHorizonDays(e.target.value)}
                        type="number"
                        placeholder="14"
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <Text size="2" style={{ marginBottom: 4 }}>Alpha (Observed Weight)</Text>
                      <TextField.Root
                        value={alphaObserved}
                        onChange={(e) => setAlphaObserved(e.target.value)}
                        type="number"
                        step="0.1"
                        placeholder="0.6"
                        style={{ width: "100%" }}
                      />
                    </div>
                    <div>
                      <Text size="2" style={{ marginBottom: 4 }}>Emergency Days Cover</Text>
                      <TextField.Root
                        value={emergencyDaysCover}
                        onChange={(e) => setEmergencyDaysCover(e.target.value)}
                        type="number"
                        step="0.1"
                        placeholder="2.0"
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                </div>
              </details>

              {optError && (
                <div
                  style={{
                    padding: 12,
                    backgroundColor: "#fee2e2",
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    color: "#991b1b",
                    fontSize: 14,
                  }}
                >
                  {optError}
                </div>
              )}

              <Button
                onClick={handleOptimizedDecision}
                disabled={optLoading}
                style={{ width: "100%", backgroundColor: "#0f172a" }}
              >
                {optLoading ? "Analyzing..." : "Get Recommendation"}
              </Button>

              {optResult && (
                <div
                  style={{
                    padding: 16,
                    backgroundColor:
                      optResult.decision === "EMERGENCY_BUY"
                        ? "#fee2e2"
                        : optResult.decision === "BUY_NOW"
                          ? "#dcfce7"
                          : optResult.decision === "WAIT"
                            ? "#dbeafe"
                            : "#fef3c7",
                    border: `2px solid ${
                      optResult.decision === "EMERGENCY_BUY"
                        ? "#dc2626"
                        : optResult.decision === "BUY_NOW"
                          ? "#16a34a"
                          : optResult.decision === "WAIT"
                            ? "#2563eb"
                            : "#d97706"
                    }`,
                    borderRadius: 8,
                  }}
                >
                  <Text weight="bold" size="2" style={{ marginBottom: 8 }}>
                    📊 Recommendation
                  </Text>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: "bold",
                      color:
                        optResult.decision === "EMERGENCY_BUY"
                          ? "#dc2626"
                          : optResult.decision === "BUY_NOW"
                            ? "#16a34a"
                            : optResult.decision === "WAIT"
                              ? "#2563eb"
                              : "#d97706",
                      marginTop: 8,
                    }}
                  >
                    {optResult.decision === "EMERGENCY_BUY"
                      ? "🚨 EMERGENCY BUY"
                      : optResult.decision === "BUY_NOW"
                        ? "🟢 BUY NOW"
                        : optResult.decision === "WAIT"
                          ? "🔵 WAIT"
                          : "🟡 HOLD"}
                  </div>
                  
                  {optResult.reason && (
                    <Text
                      size="2"
                      style={{
                        marginTop: 12,
                        padding: 12,
                        backgroundColor: "rgba(255,255,255,0.5)",
                        borderRadius: 6,
                        color: "#374151",
                        fontWeight: "500",
                      }}
                    >
                      {optResult.reason}
                    </Text>
                  )}
                  
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                      <Text size="2">Observed Velocity:</Text>
                      <Text weight="bold" size="2">{optResult.observed_daily_velocity.toFixed(2)}/day</Text>
                    </div>
                    
                    {optResult.scenarios && (
                      <div style={{ marginTop: 12, padding: 12, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 6 }}>
                        <Text weight="bold" size="2" style={{ marginBottom: 8 }}>
                          Scenarios Analyzed
                        </Text>
                        {Object.entries(optResult.scenarios).map(([key, value]: [string, any]) => (
                          <div key={key} style={{ padding: "4px 0", fontSize: 13 }}>
                            <Text size="1" style={{ color: "#6b7280" }}>
                              {key}: {JSON.stringify(value)}
                            </Text>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </Box>
      )}
    </Box>
  );
}
