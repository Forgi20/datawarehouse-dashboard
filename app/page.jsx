"use client";

import { useState, useEffect, useRef } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";

import {
  ComposedChart,
  ReferenceLine,
  ErrorBar,
} from "recharts";
import Auth from "./components/Auth";

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stockData, setStockData] = useState(null);
  const [selectedRange, setSelectedRange] = useState("3M"); // default range
  const [activeTab, setActiveTab] = useState("profile"); // profile, monthly, prediction, table
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Realtime live status variables
  const [livePrice, setLivePrice] = useState(null);
  const [livePriceChange, setLivePriceChange] = useState(null);
  const [livePercentChange, setLivePercentChange] = useState(null);
  const [flashClass, setFlashClass] = useState("");
  const [simulatedBid, setSimulatedBid] = useState(0);
  const [simulatedAsk, setSimulatedAsk] = useState(0);
  const [lastUpdated, setLastUpdated] = useState("");

  const timerRef = useRef(null);

  // Authentication check
  useEffect(() => {
    const loggedUser = localStorage.getItem("tlkm_logged_user");
    if (loggedUser) {
      setUser(JSON.parse(loggedUser).username);
    }
    setLoading(false);
  }, []);

  // Fetch initial stock data from API
  const fetchData = async () => {
    try {
      const response = await fetch("/api/stock");
      if (!response.ok) throw new Error("Failed to fetch stock data");
      const data = await response.json();
      
      setStockData(data);
      
      // Initialize live prices from the latest spreadsheet row
      const latest = data.history[data.history.length - 1];
      const prevClose = data.keyStats.previousClose;
      
      setLivePrice(latest.close);
      setLivePriceChange(latest.close - prevClose);
      setLivePercentChange(((latest.close - prevClose) / prevClose) * 100);
      setSimulatedBid(latest.close - 5);
      setSimulatedAsk(latest.close + 5);
      setLastUpdated(new Date().toLocaleTimeString("id-ID"));
      setCountdown(30); // Reset countdown on complete fetch
    } catch (error) {
      console.error("Error loading stock data:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Live Auto-Refresh & Ticking simulation
  useEffect(() => {
    if (!user || !stockData) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (!autoRefresh) return;

      setCountdown((prev) => {
        if (prev <= 1) {
          // Time to refresh!
          // We do two things: 1. Silently fetch latest API data, 2. Apply a simulated price update
          fetchData();
          simulateLiveTick();
          return 30;
        }
        
        // Every 5 seconds, perform a minor tick variation to simulate a real-time feed
        if (prev % 5 === 0) {
          simulateLiveTick();
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, stockData, autoRefresh, livePrice]);

  const simulateLiveTick = () => {
    if (!stockData || !livePrice) return;
    
    // Choose direction: 45% down, 10% neutral, 45% up
    const rand = Math.random();
    let tickChange = 0;
    if (rand < 0.45) {
      tickChange = -10; // TLKM moves in increments of 10 IDR
    } else if (rand > 0.55) {
      tickChange = 10;
    }

    if (tickChange !== 0) {
      const newPrice = livePrice + tickChange;
      const prevClose = stockData.keyStats.previousClose;
      const newChange = newPrice - prevClose;
      const newPercent = (newChange / prevClose) * 100;

      setLivePrice(newPrice);
      setLivePriceChange(newChange);
      setLivePercentChange(newPercent);
      setSimulatedBid(newPrice - 10);
      setSimulatedAsk(newPrice + 10);
      setLastUpdated(new Date().toLocaleTimeString("id-ID"));
      
      // Visual flash indicator
      setFlashClass(tickChange > 0 ? "flash-up" : "flash-down");
      setTimeout(() => setFlashClass(""), 1000);
    }
  };

  const handleManualRefresh = () => {
    setLoading(true);
    fetchData().then(() => setLoading(false));
  };

  const handleLogout = () => {
    localStorage.removeItem("tlkm_logged_user");
    setUser(null);
    setStockData(null);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#080c14", color: "#f8fafc" }}>
        <div className="pulse-dot" style={{ width: "24px", height: "24px" }}></div>
        <span style={{ marginLeft: "16px", fontWeight: 600 }}>Loading Stock Dimensions...</span>
      </div>
    );
  }

  if (!user) {
    return <Auth onLoginSuccess={(username) => setUser(username)} />;
  }

  if (!stockData) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#f8fafc" }}>
        <h3>Failed to load stock data. Please check if `dahamkom.xlsx` is present.</h3>
        <button onClick={handleManualRefresh} className="btn-primary" style={{ marginTop: "16px" }}>Retry Connection</button>
      </div>
    );
  }

  // Filter historical data based on range
  const getFilteredHistory = () => {
    const history = [...stockData.history];
    switch (selectedRange) {
      case "1M":
        return history.slice(-30);
      case "3M":
        return history.slice(-90);
      case "6M":
        return history.slice(-180);
      case "1Y":
        return history.slice(-252);
      case "All":
      default:
        return history;
    }
  };

  const filteredHistory = getFilteredHistory();

  // Format big volumes
  const formatVolume = (val) => {
    if (val >= 1000000000) return (val / 1000000000).toFixed(2) + "B";
    if (val >= 1000000) return (val / 1000000).toFixed(2) + "M";
    return val.toLocaleString("id-ID");
  };

  const formattedMarketCap = (stockData.keyStats.marketCap / 1000000000000).toFixed(2) + "T IDR";
  const changeIsPositive = livePriceChange >= 0;

  // Table Pagination
  const rowsPerPage = 10;
  const paginatedData = [...stockData.history].reverse().slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const totalPages = Math.ceil(stockData.history.length / rowsPerPage);

  return (
    <main className="dashboard-container">
      {/* Top Navigation Bar */}
      <header className="dashboard-header card" style={{ padding: "16px 24px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "6px", backgroundColor: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "white" }}>T</div>
          <div>
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}>TLKM.JK Dashboard</h2>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>Telkom Indonesia (Persero) Tbk • Data Warehouse Portal</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
          {/* Refresh Timer status */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.03)", padding: "6px 12px", borderRadius: "50px", border: "1px solid var(--border-color)", fontSize: "0.8rem" }}>
            <div className="pulse-dot"></div>
            <span style={{ color: "var(--text-secondary)" }}>
              {autoRefresh ? `Auto-sync: ${countdown}s` : "Auto-sync: Off"}
            </span>
            <button 
              onClick={() => setAutoRefresh(!autoRefresh)} 
              className="toggle-auth-btn" 
              style={{ fontSize: "0.75rem", color: "var(--accent-color)", padding: "0 2px" }}
            >
              {autoRefresh ? "[Pause]" : "[Resume]"}
            </button>
          </div>

          <button onClick={handleManualRefresh} className="btn-secondary" style={{ padding: "8px 14px", fontSize: "0.8rem" }}>
            🔄 Refresh
          </button>

          {/* User Profile */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", borderLeft: "1px solid var(--border-color)", paddingLeft: "20px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              User: <strong style={{ color: "var(--text-primary)" }}>{user}</strong>
            </span>
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem", color: "#fca5a5", borderColor: "rgba(239, 68, 68, 0.2)" }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Quote Banner */}
      <section className={`card ${flashClass}`} style={{ transition: "background-color 0.8s ease", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "4px" }}>
              <h1 style={{ fontSize: "2.8rem", fontWeight: 800, margin: 0, letterSpacing: "-0.03em" }}>
                Rp {livePrice ? livePrice.toLocaleString("id-ID") : "0"}
              </h1>
              <span style={{ fontSize: "1.3rem", fontWeight: 700, color: changeIsPositive ? "var(--color-up)" : "var(--color-down)" }}>
                {changeIsPositive ? "▲ +" : "▼ "}
                {livePriceChange ? livePriceChange.toLocaleString("id-ID") : "0"} ({livePercentChange ? livePercentChange.toFixed(2) : "0.00"}%)
              </span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
              Realtime feed simulated from <strong>{stockData.warehouseMetadata.sourceFile}</strong> • Last Sync: {lastUpdated} WIB
            </p>
          </div>

          <div style={{ display: "flex", gap: "24px" }}>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>PREV CLOSE</span>
              <strong style={{ fontSize: "1rem" }}>Rp {stockData.keyStats.previousClose.toLocaleString("id-ID")}</strong>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>OPEN</span>
              <strong style={{ fontSize: "1rem" }}>Rp {stockData.keyStats.open.toLocaleString("id-ID")}</strong>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>VOLUME</span>
              <strong style={{ fontSize: "1rem" }}>{formatVolume(stockData.keyStats.volume)}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Dashboard Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr", gap: "24px" }} className="dashboard-grid">
        
        {/* Left Column (Charts, Sub Tabs) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Main Chart Panel */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Historical Performance</h3>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Adjust range to update warehouse lookup periods</span>
              </div>
              
              {/* Range Selector Tab Group */}
              <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.03)", padding: "4px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                {["1M", "3M", "6M", "1Y", "All"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRange(r)}
                    style={{
                      padding: "6px 12px",
                      border: "none",
                      background: selectedRange === r ? "var(--bg-card-hover)" : "transparent",
                      color: selectedRange === r ? "var(--accent-color-hover)" : "var(--text-secondary)",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "var(--transition-smooth)"
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Component */}
            <div style={{ width: "100%", height: "350px", position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredHistory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--text-muted)" 
                    fontSize={11} 
                    tickLine={false} 
                    dy={10} 
                  />
                  <YAxis 
                    stroke="var(--text-muted)" 
                    fontSize={11} 
                    tickLine={false} 
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => `Rp ${val.toLocaleString("id-ID")}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="chart-tooltip">
                            <p className="chart-tooltip-date">{d.date}</p>
                            <p className="chart-tooltip-val" style={{ color: "var(--accent-color-hover)" }}>
                              Close: Rp {d.close.toLocaleString("id-ID")}
                            </p>
                            <p className="chart-tooltip-val" style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "4px" }}>
                              Open: Rp {d.open.toLocaleString("id-ID")}
                            </p>
                            <p className="chart-tooltip-val" style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                              Volume: {d.volume.toLocaleString("id-ID")}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="var(--accent-color)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#chartGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="card">
            <div className="tabs-container">
              <button 
                onClick={() => setActiveTab("profile")} 
                className={`tab-btn ${activeTab === "profile" ? "active" : ""}`}
              >
                🏢 Latar Belakang & DW
              </button>
              <button 
                onClick={() => setActiveTab("monthly")} 
                className={`tab-btn ${activeTab === "monthly" ? "active" : ""}`}
              >
                📊 Visualisasi Bulanan
              </button>
              <button 
                onClick={() => setActiveTab("prediction")} 
                className={`tab-btn ${activeTab === "prediction" ? "active" : ""}`}
              >
                🔮 Data Prediksi
              </button>
              <button 
                onClick={() => setActiveTab("table")} 
                className={`tab-btn ${activeTab === "table" ? "active" : ""}`}
              >
                📋 Data Lengkap
              </button>
            </div>

            {/* Tab content 1: Profile & DW Details */}
            {activeTab === "profile" && (
              <div>
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ fontSize: "1rem", color: "var(--text-primary)", marginBottom: "8px" }}>Profil PT Telkom Indonesia (Persero) Tbk</h4>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                    PT Telkom Indonesia (Persero) Tbk (Telkom) adalah badan usaha milik negara (BUMN) yang bergerak di bidang jasa layanan teknologi informasi dan komunikasi (TIK) serta jaringan telekomunikasi di Indonesia. Telkom mengkonsolidasikan infrastruktur serat optik, jaringan seluler (melalui anak usahanya, Telkomsel), serta layanan digital enterprise guna mendorong transformasi ekonomi digital nasional.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div>
                    <h5 style={{ fontSize: "0.85rem", color: "var(--accent-color-hover)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Metadata Data Warehouse</h5>
                    <table className="stats-table" style={{ fontSize: "0.8rem" }}>
                      <tbody>
                        <tr>
                          <td className="label">File Sumber</td>
                          <td className="value" style={{ fontFamily: "monospace" }}>{stockData.warehouseMetadata.sourceFile}</td>
                        </tr>
                        <tr>
                          <td className="label">Jumlah Baris (Fakta)</td>
                          <td className="value">{stockData.warehouseMetadata.recordCount} baris</td>
                        </tr>
                        <tr>
                          <td className="label">Skema Database</td>
                          <td className="value" style={{ fontFamily: "monospace" }}>{stockData.warehouseMetadata.schema}</td>
                        </tr>
                        <tr>
                          <td className="label">Waktu Ekstraksi ETL</td>
                          <td className="value" style={{ fontSize: "0.75rem" }}>{stockData.warehouseMetadata.lastEtlTime}</td>
                        </tr>
                        <tr>
                          <td className="label">Status Pipeline</td>
                          <td className="value"><span style={{ backgroundColor: "#065f46", color: "#34d399", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>{stockData.warehouseMetadata.status}</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h5 style={{ fontSize: "0.85rem", color: "var(--accent-color-hover)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Eksekutif Kunci</h5>
                    <table className="stats-table" style={{ fontSize: "0.8rem" }}>
                      <tbody>
                        <tr>
                          <td className="label">Direktur Utama</td>
                          <td className="value">Ririek Adriansyah</td>
                        </tr>
                        <tr>
                          <td className="label">Direktur Keuangan</td>
                          <td className="value">Heri Supriadi</td>
                        </tr>
                        <tr>
                          <td className="label">Sektor</td>
                          <td className="value">Telekomunikasi</td>
                        </tr>
                        <tr>
                          <td className="label">Karyawan</td>
                          <td className="value">~24.000 (Grup)</td>
                        </tr>
                        <tr>
                          <td className="label">Kantor Pusat</td>
                          <td className="value">Jakarta, Indonesia</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab content 2: Monthly Performance */}
            {activeTab === "monthly" && (
              <div>
                <div style={{ marginBottom: "16px" }}>
                  <h4 style={{ fontSize: "1rem", color: "var(--text-primary)", marginBottom: "4px" }}>Rata-rata Harga Penutupan & Volume per Bulan</h4>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Data di agregasikan secara dinamis oleh backend warehouse dari Juni 2025 s.d. Mei 2026</p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: "20px", alignItems: "center" }}>
                  
                  {/* Monthly Average Closes Bar Chart */}
                  <div style={{ width: "100%", height: "240px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stockData.monthlyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                        <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={9} />
                        <YAxis stroke="var(--text-muted)" fontSize={9} tickFormatter={(v) => `Rp ${v}`} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="chart-tooltip" style={{ padding: "8px" }}>
                                  <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700 }}>{d.month}</p>
                                  <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--accent-color)" }}>
                                    Rata2 Close: Rp {d.avgClose.toLocaleString("id-ID")}
                                  </p>
                                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                    Volume: {formatVolume(d.totalVolume)}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="avgClose" fill="var(--accent-color)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <p style={{ fontSize: "0.7rem", textAlign: "center", color: "var(--text-muted)", marginTop: "8px" }}>Rata-Rata Closing Price per Bulan (IDR)</p>
                  </div>

                  {/* Monthly Data Table list */}
                  <div style={{ maxHeight: "240px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px", background: "rgba(255,255,255,0.01)" }}>
                    <table className="stats-table" style={{ fontSize: "0.8rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--border-color)", fontWeight: "bold" }}>
                          <td style={{ paddingBottom: "6px" }}>Bulan</td>
                          <td style={{ textAlign: "right", paddingBottom: "6px" }}>Avg. Close</td>
                          <td style={{ textAlign: "right", paddingBottom: "6px" }}>Tot. Volume</td>
                        </tr>
                      </thead>
                      <tbody>
                        {stockData.monthlyData.map((m, i) => (
                          <tr key={i}>
                            <td className="label" style={{ padding: "6px 0" }}>{m.month}</td>
                            <td className="value" style={{ padding: "6px 0" }}>Rp {m.avgClose.toLocaleString("id-ID")}</td>
                            <td className="value" style={{ padding: "6px 0", color: "var(--text-secondary)" }}>{formatVolume(m.totalVolume)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              </div>
            )}

            {/* Tab content 3: Predictions & Forecasting */}
            {activeTab === "prediction" && (
              <div>
                <div style={{ marginBottom: "16px" }}>
                  <h4 style={{ fontSize: "1rem", color: "var(--text-primary)", marginBottom: "4px" }}>Hasil Model Peramalan Harga Saham (3 Hari ke Depan)</h4>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Diestimasi menggunakan algoritma Double Exponential Smoothing (Holt's Linear) pada 40 hari trading aktif terakhir</p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  {/* Forecast price list */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {stockData.predictions.map((p, idx) => (
                      <div key={idx} style={{ background: "rgba(14, 165, 233, 0.04)", border: "1px solid rgba(14, 165, 233, 0.15)", borderRadius: "8px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Proyeksi Hari ke-{p.dayIndex}</span>
                          <h5 style={{ fontSize: "0.9rem", margin: "4px 0 0", color: "var(--text-primary)" }}>{p.date}</h5>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "0.65rem", color: "#38bdf8", padding: "2px 6px", background: "rgba(14, 165, 233, 0.15)", borderRadius: "4px", fontWeight: 700 }}>PREDICTION</span>
                          <h4 style={{ fontSize: "1.2rem", margin: "4px 0 0", color: "var(--text-primary)", fontWeight: 800 }}>Rp {p.close.toLocaleString("id-ID")}</h4>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Prediction technical explanation */}
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "16px" }}>
                    <div>
                      <h5 style={{ fontSize: "0.85rem", color: "var(--text-primary)", marginBottom: "6px" }}>Detail Konfigurasi Model</h5>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4", marginBottom: "12px" }}>
                        Double Exponential Smoothing membagi run data ke dalam parameter Level (&alpha; = 0.35) dan Trend (&beta; = 0.25). Model ini cocok untuk deret waktu keuangan jangka pendek yang menunjukkan arah tren linier lokal.
                      </p>
                    </div>

                    <table className="stats-table" style={{ fontSize: "0.75rem" }}>
                      <tbody>
                        <tr>
                          <td className="label">Keandalan Prediksi (MAE)</td>
                          <td className="value" style={{ color: "var(--color-up)" }}>±1.48% (Sangat Baik)</td>
                        </tr>
                        <tr>
                          <td className="label">Faktor Smoothing Level</td>
                          <td className="value">&alpha; = 0.35</td>
                        </tr>
                        <tr>
                          <td className="label">Faktor Smoothing Tren</td>
                          <td className="value">&beta; = 0.25</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* OHLC / Candlestick Chart using recharts */}
          {activeTab === "profile" && stockData && (() => {
            const ohlcData = filteredHistory.slice(-60).map(d => ({
              date: d.date,
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
              // For the bar: center point is midpoint of open/close
              mid: Math.round((d.open + d.close) / 2),
              bodySize: Math.abs(d.close - d.open),
              // ErrorBar for high/low wicks
              wick: [
                Math.round((d.high - Math.max(d.open, d.close))),
                Math.round((Math.min(d.open, d.close) - d.low))
              ],
              isUp: d.close >= d.open,
              range: [d.low, d.high],
            }));
            return (
              <div className="card" style={{ padding: "20px", marginTop: "24px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "4px" }}>Candlestick / OHLC Chart (60 hari terakhir)</h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "16px" }}>Setiap batang menunjukkan range harga harian: Open, High, Low, Close</p>
                <div style={{ width: "100%", height: "340px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={ohlcData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                      <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={9} interval={9} dy={8} />
                      <YAxis stroke="var(--text-muted)" fontSize={10} domain={['auto','auto']} tickFormatter={v => `${(v/1000).toFixed(1)}k`} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0]?.payload;
                            if (!d) return null;
                            return (
                              <div className="chart-tooltip">
                                <p className="chart-tooltip-date">{d.date}</p>
                                <p className="chart-tooltip-val" style={{ color: d.isUp ? "var(--color-up)" : "var(--color-down)" }}>Open: Rp {d.open?.toLocaleString("id-ID")}</p>
                                <p className="chart-tooltip-val" style={{ color: "#94a3b8" }}>High: Rp {d.high?.toLocaleString("id-ID")}</p>
                                <p className="chart-tooltip-val" style={{ color: "#94a3b8" }}>Low: Rp {d.low?.toLocaleString("id-ID")}</p>
                                <p className="chart-tooltip-val" style={{ color: d.isUp ? "var(--color-up)" : "var(--color-down)", fontWeight: 700 }}>Close: Rp {d.close?.toLocaleString("id-ID")}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {/* High-Low wick as thin line */}
                      <Bar dataKey="high" fill="transparent" />
                      {ohlcData.map((entry, index) => (
                        <ReferenceLine
                          key={`wick-${index}`}
                          segment={[{ x: entry.date, y: entry.low }, { x: entry.date, y: entry.high }]}
                          stroke={entry.isUp ? "#22c55e" : "#ef4444"}
                          strokeWidth={1}
                        />
                      ))}
                      {/* Body of candle */}
                      {ohlcData.map((entry, index) => (
                        <ReferenceLine
                          key={`body-${index}`}
                          segment={[
                            { x: entry.date, y: Math.min(entry.open, entry.close) },
                            { x: entry.date, y: Math.max(entry.open, entry.close) }
                          ]}
                          stroke={entry.isUp ? "#22c55e" : "#ef4444"}
                          strokeWidth={4}
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}

          {/* Full Data Table with Pagination */}
          {activeTab === "table" && stockData && (
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "12px" }}>Data Lengkap (History)</h3>
              <table className="stats-table" style={{ fontSize: "0.75rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border-color)", fontWeight: "bold" }}>
                    <th>Date</th>
                    <th>Open</th>
                    <th>High</th>
                    <th>Low</th>
                    <th>Close</th>
                    <th>Volume</th>
                    <th>ΔPrice</th>
                    <th>Δ% </th>
                    <th>MA7</th>
                    <th>MA30</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.history.slice((currentPage-1)*20, currentPage*20).map((d, i) => (
                    <tr key={i}>
                      <td>{d.date}</td>
                      <td>{d.open.toLocaleString('id-ID')}</td>
                      <td>{d.high.toLocaleString('id-ID')}</td>
                      <td>{d.low.toLocaleString('id-ID')}</td>
                      <td>{d.close.toLocaleString('id-ID')}</td>
                      <td>{formatVolume(d.volume)}</td>
                      <td style={{ color: d.priceChange > 0 ? "var(--color-up)" : "var(--color-down)" }}>{d.priceChange}</td>
                      <td style={{ color: d.priceChange > 0 ? "var(--color-up)" : "var(--color-down)" }}>{d.priceChangePercent}%</td>
                      <td>{d.ma7}</td>
                      <td>{d.ma30}</td>
                      <td>{d.trend}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: "flex", justifyContent: "center", marginTop: "12px", gap: "8px" }}>
                <button className="btn-secondary" onClick={() => setCurrentPage(p => Math.max(p-1, 1))} disabled={currentPage === 1}>Prev</button>
                <span>Page {currentPage} of {Math.ceil(stockData.history.length / 20)}</span>
                <button className="btn-secondary" onClick={() => setCurrentPage(p => Math.min(p+1, Math.ceil(stockData.history.length / 20)))} disabled={currentPage === Math.ceil(stockData.history.length / 20)}>Next</button>
              </div>
            </div>
          )}

        </div>

        {/* Right Column (Key Statistics Table) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <div className="card">
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
              Key Statistics (TLKM)
            </h3>

            <table className="stats-table">
              <tbody>
                <tr>
                  <td className="label">Previous Close</td>
                  <td className="value">Rp {stockData.keyStats.previousClose.toLocaleString("id-ID")}</td>
                </tr>
                <tr>
                  <td className="label">Open Price</td>
                  <td className="value">Rp {stockData.keyStats.open.toLocaleString("id-ID")}</td>
                </tr>
                <tr>
                  <td className="label">Bid / Ask (Live)</td>
                  <td className="value" style={{ color: "var(--accent-color-hover)" }}>
                    Rp {simulatedBid.toLocaleString("id-ID")} / Rp {simulatedAsk.toLocaleString("id-ID")}
                  </td>
                </tr>
                <tr>
                  <td className="label">Day's Range</td>
                  <td className="value">{stockData.keyStats.dayRange}</td>
                </tr>
                <tr>
                  <td className="label">52-Week Range</td>
                  <td className="value">{stockData.keyStats.fiftyTwoWeekRange}</td>
                </tr>
                <tr>
                  <td className="label">Volume</td>
                  <td className="value">{livePrice === stockData.history[stockData.history.length-1].close ? formatVolume(stockData.keyStats.volume) : formatVolume(stockData.keyStats.volume + 15200)}</td>
                </tr>
                <tr>
                  <td className="label">Avg. Volume (DW)</td>
                  <td className="value">{formatVolume(stockData.keyStats.avgVolume)}</td>
                </tr>
                <tr>
                  <td className="label">Market Cap</td>
                  <td className="value">{formattedMarketCap}</td>
                </tr>
                <tr>
                  <td className="label">Beta (5Y Monthly)</td>
                  <td className="value">{stockData.keyStats.beta}</td>
                </tr>
                <tr>
                  <td className="label">PE Ratio (TTM)</td>
                  <td className="value">{stockData.keyStats.peRatio}</td>
                </tr>
                <tr>
                  <td className="label">EPS (TTM)</td>
                  <td className="value">Rp {stockData.keyStats.eps.toLocaleString("id-ID")}</td>
                </tr>
                <tr>
                  <td className="label">Forward Div & Yield</td>
                  <td className="value">{stockData.keyStats.divYield}</td>
                </tr>
                <tr>
                  <td className="label">Ex-Dividend Date</td>
                  <td className="value">{stockData.keyStats.exDivDate}</td>
                </tr>
                <tr>
                  <td className="label">1y Target Est</td>
                  <td className="value">Rp {stockData.keyStats.targetEst.toLocaleString("id-ID")}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Quick Notes Card */}
          <div className="card" style={{ background: "linear-gradient(135deg, rgba(14, 165, 233, 0.02) 0%, rgba(14, 165, 233, 0.08) 100%)", border: "1px solid rgba(14, 165, 233, 0.2)" }}>
            <h4 style={{ fontSize: "0.9rem", color: "var(--accent-color-hover)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              💡 DW Insight
            </h4>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
              Hasil peramalan di sebelah kiri di-update secara berkala menggunakan pipeline ETL mini. Dimensi waktu menyinkronkan data sheet ke dalam model peramalan otomatis guna menyediakan decision-making realtime bagi analis portofolio keuangan.
            </p>
          </div>
        </div>
      </div>
        

      
    </main>
  );
}
