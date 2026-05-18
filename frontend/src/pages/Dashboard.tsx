/**
 * ILA — DashboardHome.jsx
 * Carbon Design System + GSAP animations
 * Calls: GET /api/v1/dashboard/stats
 *        GET /api/v1/entities (search)
 *        navigates to /entities/:id on entity click
 *
 * Dependencies (add to package.json if missing):
 *   @carbon/react, @carbon/icons-react, gsap, recharts
 *   "gsap": "^3.12.x"
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Carbon imports ────────────────────────────────────────────────────────────
import {
  Search,
  Tag,
  InlineLoading,
  SkeletonText,
  SkeletonPlaceholder,
} from "@carbon/react";
import {
  Warning,
  WarningAlt,
  Enterprise,
  DocumentBlank,
  Activity,
  ChevronRight,
  CircleFill,
  ArrowUp,
  ArrowDown,
} from "@carbon/icons-react";

// ── GSAP import ───────────────────────────────────────────────────────────────
import { gsap } from "gsap";

// ── Constants ─────────────────────────────────────────────────────────────────
const API_BASE = "/api/v1";
const RISK_COLOR = {
  critical: "#da1e28",
  high: "#ff832b",
  medium: "#f1c21b",
  low: "#42be65",
};
const RISK_BG = {
  critical: "rgba(218,30,40,.12)",
  high: "rgba(255,131,43,.12)",
  medium: "rgba(241,194,27,.12)",
  low: "rgba(66,190,101,.12)",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function riskTag(level = "low") {
  const l = (level || "low").toLowerCase();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 2,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        background: RISK_BG[l] || RISK_BG.low,
        color: RISK_COLOR[l] || RISK_COLOR.low,
        border: `1px solid ${RISK_COLOR[l] || RISK_COLOR.low}33`,
      }}
    >
      <CircleFill size={8} />
      {l}
    </span>
  );
}

function scoreBar(score = 0) {
  const pct = Math.min(100, Math.round((score / 10) * 100));
  const color =
    pct >= 80
      ? RISK_COLOR.critical
      : pct >= 60
      ? RISK_COLOR.high
      : pct >= 40
      ? RISK_COLOR.medium
      : RISK_COLOR.low;
  return (
    <div style={{ marginTop: 6, height: 3, background: "#393939", borderRadius: 2 }}>
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          borderRadius: 2,
          transition: "width 1.2s cubic-bezier(.16,1,.3,1)",
        }}
      />
    </div>
  );
}

// ── Carbon-styled custom tooltip for Recharts ─────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: any; payload?: any; label?: any }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#262626",
        border: "1px solid #393939",
        padding: "8px 12px",
        fontSize: 12,
        color: "#f4f4f4",
        boxShadow: "0 4px 12px rgba(0,0,0,.5)",
      }}
    >
      <div style={{ color: "#8d8d8d", marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600, color: "#78a9ff" }}>
        {payload[0].value} alerts
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, accent, loading, cardRef }) {
  return (
    <div
      ref={cardRef}
      style={{
        background: "#161616",
        border: "1px solid #393939",
        padding: "20px 24px",
        position: "relative",
        overflow: "hidden",
        opacity: 0,
        transform: "translateY(24px)",
      }}
    >
      {/* accent stripe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: accent || "#78a9ff",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 12, color: "#8d8d8d", letterSpacing: ".06em", textTransform: "uppercase" }}>
          {label}
        </div>
        {Icon && (
          <Icon
            size={20}
            style={{ color: accent || "#78a9ff", flexShrink: 0 }}
          />
        )}
      </div>
      {loading ? (
        <SkeletonText width="60%" />
      ) : (
        <div
          style={{
            fontSize: 36,
            fontWeight: 300,
            color: "#f4f4f4",
            lineHeight: 1,
            letterSpacing: "-1px",
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {value?.toLocaleString() ?? "—"}
        </div>
      )}
      {sub && !loading && (
        <div style={{ fontSize: 11, color: "#6f6f6f", marginTop: 6 }}>{sub}</div>
      )}
    </div>
  );
}

// ── Alert badge row ───────────────────────────────────────────────────────────
function AlertBadges({ critical, high, loading }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {loading ? (
        <>
          <div style={{ height: 28 }}>
            <SkeletonText width="80px" />
          </div>
          <div style={{ height: 28 }}>
            <SkeletonText width="80px" />
          </div>
        </>
      ) : (
        <>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: RISK_BG.critical,
              border: `1px solid ${RISK_COLOR.critical}44`,
              color: RISK_COLOR.critical,
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: ".04em",
            }}
          >
            <Warning size={14} /> {critical} CRITICAL
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: RISK_BG.high,
              border: `1px solid ${RISK_COLOR.high}44`,
              color: RISK_COLOR.high,
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: ".04em",
            }}
          >
            <WarningAlt size={14} /> {high} HIGH
          </span>
        </>
      )}
    </div>
  );
}

// ── Entity mini card ──────────────────────────────────────────────────────────
function EntityCard({ entity, index, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onClick(entity.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#1c1c1c" : "#161616",
        border: `1px solid ${hovered ? "#525252" : "#393939"}`,
        padding: "14px 16px",
        cursor: "pointer",
        transition: "all .18s ease",
        display: "flex",
        alignItems: "center",
        gap: 12,
        transform: hovered ? "translateX(3px)" : "none",
      }}
    >
      {/* rank */}
      <div
        style={{
          minWidth: 28,
          height: 28,
          background: "#262626",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: "#6f6f6f",
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#f4f4f4",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {entity.display_name || entity.primary_identifier}
        </div>
        <div style={{ fontSize: 11, color: "#6f6f6f", marginTop: 2 }}>
          {entity.entity_type} · {entity.event_count} events
        </div>
      </div>

      {/* score + badge */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        {riskTag(entity.risk_level)}
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            fontWeight: 700,
            color: RISK_COLOR[entity.risk_level?.toLowerCase()] || "#f4f4f4",
          }}
        >
          {(entity.risk_score ?? 0).toFixed(1)}
        </div>
      </div>

      <ChevronRight size={16} style={{ color: "#525252", flexShrink: 0 }} />
    </div>
  );
}

// ── Search overlay ────────────────────────────────────────────────────────────
function SearchOverlay({ results, loading, onSelect, query }) {
  if (!query) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        left: 0,
        right: 0,
        background: "#262626",
        border: "1px solid #525252",
        zIndex: 9999,
        maxHeight: 320,
        overflowY: "auto",
        boxShadow: "0 8px 24px rgba(0,0,0,.6)",
      }}
    >
      {loading && (
        <div style={{ padding: "12px 16px" }}>
          <InlineLoading description="Searching entities…" />
        </div>
      )}
      {!loading && results.length === 0 && (
        <div style={{ padding: "12px 16px", color: "#6f6f6f", fontSize: 13 }}>
          No entities found for "{query}"
        </div>
      )}
      {!loading &&
        results.map((e) => (
          <div
            key={e.id}
            onClick={() => onSelect(e.id)}
            style={{
              padding: "10px 16px",
              cursor: "pointer",
              borderBottom: "1px solid #393939",
              display: "flex",
              alignItems: "center",
              gap: 10,
              transition: "background .1s",
            }}
            onMouseEnter={(ev) => (ev.currentTarget.style.background = "#333333")}
            onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "#f4f4f4", fontWeight: 500 }}>
                {e.display_name || e.primary_identifier}
              </div>
              <div style={{ fontSize: 11, color: "#6f6f6f" }}>
                {e.entity_type} · {e.primary_identifier}
              </div>
            </div>
            {riskTag(e.risk_level)}
          </div>
        ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DashboardHome — main export
// ══════════════════════════════════════════════════════════════════════════════
export default function DashboardHome() {
  const navigate = useNavigate();

  // ── state ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);

  // ── refs for GSAP ──────────────────────────────────────────────────────────
  const headerRef = useRef(null);
  const kpiRefs = useRef([]);
  const chartRef = useRef(null);
  const entityListRef = useRef(null);

  // ── fetch stats ────────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    async function fetchStats() {
      try {
        const r = await fetch(`${API_BASE}/dashboard/stats`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (active) setStats(data);
      } catch (err) {
        if (active) setStatsError(err.message);
      } finally {
        if (active) setStatsLoading(false);
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // ── GSAP entrance animations ───────────────────────────────────────────────
  useEffect(() => {
    if (statsLoading) return;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      if (headerRef.current) {
        tl.fromTo(
          headerRef.current,
          { opacity: 0, y: -20 },
          { opacity: 1, y: 0, duration: 0.6 }
        );
      }

      const cards = kpiRefs.current.filter(Boolean);
      if (cards.length) {
        tl.to(
          cards,
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.08,
          },
          "-=0.3"
        );
      }

      if (chartRef.current) {
        tl.fromTo(
          chartRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5 },
          "-=0.2"
        );
      }

      if (entityListRef.current) {
        tl.fromTo(
          entityListRef.current,
          { opacity: 0, x: 20 },
          { opacity: 1, x: 0, duration: 0.5 },
          "-=0.4"
        );
      }
  }, [statsLoading]);

  // ── search debounce ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `${API_BASE}/entities?search=${encodeURIComponent(searchQuery)}&page_size=8`,
          { credentials: "include" }
        );
        if (!r.ok) throw new Error();
        const data = await r.json();
        setSearchResults(data.items || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── close search on outside click ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goEntity = useCallback((id) => navigate(`/entities/${id}`), [navigate]);

  // ── chart data ─────────────────────────────────────────────────────────────
  const chartData = stats?.alerts_last_24h_by_hour ?? [];

  // ── KPI config ─────────────────────────────────────────────────────────────
  const kpis = [
    {
      icon: Enterprise,
      label: "Entities Tracked",
      value: stats?.total_entities_tracked ?? stats?.total_entities,
      sub: `${stats?.flagged_entities ?? 0} flagged`,
      accent: "#78a9ff",
    },
    {
      icon: Activity,
      label: "Alerts Today",
      value: stats?.alerts_today,
      sub: "across all statuses",
      accent: "#ff832b",
    },
    {
      icon: Warning,
      label: "High-Risk Entities",
      value: stats?.high_risk_entities ?? stats?.risk_metrics?.entities_high_or_critical,
      sub: `avg score ${(stats?.risk_metrics?.avg_entity_risk_score ?? 0).toFixed(2)}`,
      accent: "#da1e28",
    },
    {
      icon: DocumentBlank,
      label: "Active Sources",
      value: stats?.active_sources,
      sub: `${stats?.events_today ?? 0} events today`,
      accent: "#42be65",
    },
  ];

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0f0f",
        color: "#f4f4f4",
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        padding: "0 0 64px",
      }}
    >
      {/* ── Top bar ── */}
      <div
        ref={headerRef}
        style={{
          borderBottom: "1px solid #262626",
          padding: "20px 32px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          background: "#161616",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: "#78a9ff",
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            ILA — Intelligence & Link Analysis
          </div>
          <div style={{ fontSize: 20, fontWeight: 400, color: "#f4f4f4" }}>
            Dashboard Overview
          </div>
        </div>

        {/* Live indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#42be65",
              boxShadow: "0 0 0 3px rgba(66,190,101,.25)",
              animation: "pulse 2s infinite",
            }}
          />
          <span style={{ fontSize: 11, color: "#6f6f6f", letterSpacing: ".06em" }}>
            LIVE · refreshes every 30s
          </span>
        </div>
      </div>

      {/* pulse keyframe */}
      <style>{`
        @keyframes pulse {
          0%,100%{box-shadow:0 0 0 3px rgba(66,190,101,.25)}
          50%{box-shadow:0 0 0 6px rgba(66,190,101,.08)}
        }
      `}</style>

      <div style={{ padding: "28px 32px", maxWidth: 1440, margin: "0 auto" }}>
        {/* ── Search bar ── */}
        <div
          ref={searchRef}
          style={{ position: "relative", maxWidth: 480, marginBottom: 32 }}
        >
          <Search
            placeholder="Search entities by name or identifier…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            labelText="Entity search"
            size="md"
            style={{ background: "#262626", border: "1px solid #525252" }}
          />
          <SearchOverlay
            results={searchResults}
            loading={searchLoading}
            onSelect={(id) => { setSearchQuery(""); goEntity(id); }}
            query={searchQuery}
          />
        </div>

        {/* ── Error banner ── */}
        {statsError && (
          <div
            style={{
              background: "rgba(218,30,40,.12)",
              border: "1px solid #da1e28",
              padding: "12px 16px",
              marginBottom: 24,
              fontSize: 13,
              color: "#ff8389",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Warning size={16} />
            Failed to load dashboard stats: {statsError}
          </div>
        )}

        {/* ── Alert severity badges ── */}
        <div style={{ marginBottom: 20 }}>
          <AlertBadges
            critical={stats?.critical_alerts ?? 0}
            high={stats?.high_alerts ?? 0}
            loading={statsLoading}
          />
        </div>

        {/* ── KPI cards grid ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 1,
            marginBottom: 1,
            background: "#262626",
          }}
        >
          {kpis.map((k, i) => (
            <KpiCard
              key={k.label}
              {...k}
              loading={statsLoading}
              cardRef={(el) => (kpiRefs.current[i] = el)}
            />
          ))}
        </div>

        {/* ── Main body: chart + entity list ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 380px",
            gap: 1,
            marginTop: 1,
            background: "#262626",
          }}
        >
          {/* Area chart */}
          <div
            ref={chartRef}
            style={{
              background: "#161616",
              border: "none",
              padding: "24px",
              opacity: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 20,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#8d8d8d",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: 4,
                  }}
                >
                  Alert Volume
                </div>
                <div style={{ fontSize: 16, color: "#f4f4f4", fontWeight: 400 }}>
                  Last 24 hours — by hour
                </div>
              </div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 28,
                  fontWeight: 300,
                  color: "#78a9ff",
                }}
              >
                {statsLoading ? "—" : chartData.reduce((s, d) => s + d.count, 0)}
              </div>
            </div>

            {statsLoading ? (
              <SkeletonPlaceholder style={{ width: "100%", height: 220 }} />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#78a9ff" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#78a9ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#262626"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10, fill: "#6f6f6f", fontFamily: "'IBM Plex Mono', monospace" }}
                    axisLine={false}
                    tickLine={false}
                    interval={3}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#6f6f6f", fontFamily: "'IBM Plex Mono', monospace" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={CustomTooltip} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#78a9ff"
                    strokeWidth={2}
                    fill="url(#alertGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#78a9ff", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top entities panel */}
          <div
            ref={entityListRef}
            style={{
              background: "#161616",
              opacity: 0,
            }}
          >
            {/* header */}
            <div
              style={{
                padding: "20px 16px 12px",
                borderBottom: "1px solid #262626",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#8d8d8d",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: 4,
                  }}
                >
                  Highest Risk
                </div>
                <div style={{ fontSize: 16, color: "#f4f4f4" }}>
                  Top 5 Entities
                </div>
              </div>
              <button
                onClick={() => navigate("/entities")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#78a9ff",
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  padding: 0,
                }}
              >
                View all <ChevronRight size={14} />
              </button>
            </div>

            {/* entity list */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {statsLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      style={{ padding: "14px 16px", borderBottom: "1px solid #262626" }}
                    >
                      <SkeletonText width="70%" />
                      <div style={{ marginTop: 6 }}>
                        <SkeletonText width="40%" />
                      </div>
                    </div>
                  ))
                : (stats?.top_risk_entities ?? []).slice(0, 5).map((entity, i) => (
                    <div key={entity.id} style={{ borderBottom: "1px solid #262626" }}>
                      <EntityCard entity={entity} index={i} onClick={goEntity} />
                      {/* mini score bar outside the card for extra depth */}
                    </div>
                  ))}
            </div>
          </div>
        </div>

        {/* ── Secondary row: risk distribution mini stats ── */}
        {!statsLoading && stats && (
          <div
            style={{
              marginTop: 1,
              background: "#111111",
              border: "1px solid #262626",
              padding: "16px 24px",
              display: "flex",
              gap: 40,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#6f6f6f",
                textTransform: "uppercase",
                letterSpacing: ".1em",
              }}
            >
              Risk Distribution
            </div>
            {[
              { label: "Avg Risk Score", value: (stats.risk_metrics?.avg_entity_risk_score ?? 0).toFixed(3) },
              { label: "Critical + High", value: stats.risk_metrics?.entities_high_or_critical ?? 0 },
              { label: "Flagged", value: stats.flagged_entities ?? 0 },
              { label: "Events Today", value: (stats.events_today ?? 0).toLocaleString() },
            ].map((item) => (
              <div key={item.label}>
                <div
                  style={{
                    fontSize: 10,
                    color: "#6f6f6f",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    marginBottom: 2,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#c6c6c6",
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}