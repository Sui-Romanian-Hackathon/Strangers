import { useState } from "react";
import { Box, Button, Heading, Text, Card, TextField } from "@radix-ui/themes";
import { getBestBuyDate, getDailyDecision } from "./analyticsClient";
import type { BuyTimingResult, DailyDecisionResult } from "./analyticsClient";

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<"timing" | "daily">("timing");

  // Buy Timing State
  const [timingItem, setTimingItem] = useState("");
  const [startDate, setStartDate] = useState("");
  const [monthsAhead, setMonthsAhead] = useState("3");
  const [timingLoading, setTimingLoading] = useState(false);
  const [timingResult, setTimingResult] = useState<BuyTimingResult | null>(null);
  const [timingError, setTimingError] = useState<string | null>(null);

  // Daily Decision State
  const [dailyDemand, setDailyDemand] = useState("100");
  const [stock, setStock] = useState("50");
  const [holiday, setHoliday] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyResult, setDailyResult] = useState<DailyDecisionResult | null>(
    null
  );
  const [dailyError, setDailyError] = useState<string | null>(null);

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

  async function handleDailyDecision() {
    setDailyLoading(true);
    setDailyError(null);
    try {
      const result = await getDailyDecision({
        daily_demand: parseInt(dailyDemand) || 0,
        stock: parseInt(stock) || 0,
        holiday,
      });
      setDailyResult(result);
    } catch (err) {
      setDailyError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDailyLoading(false);
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
        className={`nav-btn ${activeTab === "daily" ? "primary" : ""}`}
        onClick={() => setActiveTab("daily")}
        style={{
          borderRadius: "7px",            
          border: "1px solid rgb(229, 231, 235)"
        }}
      >
          Daily Decision
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

      {/* Daily Decision Model */}
      {activeTab === "daily" && (
        <Box style={{ maxWidth: "600px", margin: "0 auto" }}>
          <Card
            style={{
              padding: 24,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
            }}
          >
            <Heading size="2" mb="4">
              Daily Buy/Hold/Sell Decision
            </Heading>
            <Text color="gray" size="2" style={{ marginBottom: 16 }}>
              Get AI-driven recommendations based on current demand and stock
              levels
            </Text>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <Text weight="bold" size="2" style={{ marginBottom: 6 }}>
                  Daily Demand
                </Text>
                <TextField.Root
                  value={dailyDemand}
                  onChange={(e) => setDailyDemand(e.target.value)}
                  type="number"
                  placeholder="e.g., 100"
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

              <div
                style={{
                  padding: 12,
                  backgroundColor: "#f3f4f6",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={holiday}
                  onChange={(e) => setHoliday(e.target.checked)}
                  style={{ cursor: "pointer", width: 18, height: 18 }}
                />
                <Text weight="bold" size="2">
                  Holiday Period
                </Text>
              </div>

              {dailyError && (
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
                  {dailyError}
                </div>
              )}

              <Button
                onClick={handleDailyDecision}
                disabled={dailyLoading}
                style={{ width: "100%", backgroundColor: "#0f172a" }}
              >
                {dailyLoading ? "Deciding..." : "Get Decision"}
              </Button>

              {dailyResult && (
                <div
                  style={{
                    padding: 16,
                    backgroundColor:
                      dailyResult.action === "BUY"
                        ? "#dcfce7"
                        : dailyResult.action === "SELL"
                          ? "#fee2e2"
                          : "#fef3c7",
                    border: `2px solid ${
                      dailyResult.action === "BUY"
                        ? "#16a34a"
                        : dailyResult.action === "SELL"
                          ? "#dc2626"
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
                        dailyResult.action === "BUY"
                          ? "#16a34a"
                          : dailyResult.action === "SELL"
                            ? "#dc2626"
                            : "#d97706",
                      marginTop: 8,
                    }}
                  >
                    {dailyResult.action === "BUY"
                      ? "🟢 BUY"
                      : dailyResult.action === "SELL"
                        ? "🔴 SELL"
                        : "🟡 HOLD"}
                  </div>
                  <Text
                    size="2"
                    style={{
                      marginTop: 12,
                      color:
                        dailyResult.action === "BUY"
                          ? "#166534"
                          : dailyResult.action === "SELL"
                            ? "#7f1d1d"
                            : "#92400e",
                    }}
                  >
                    {dailyResult.action === "BUY"
                      ? "Strong buying opportunity - demand exceeds stock"
                      : dailyResult.action === "SELL"
                        ? "High stock with low demand - consider selling"
                        : "Balanced situation - hold current inventory"}
                  </Text>
                </div>
              )}
            </div>
          </Card>
        </Box>
      )}
    </Box>
  );
}
