/**
 * ReportsPage.tsx
 * ILA OSINT Platform — E-SitRep Generator
 * IBM Carbon Design System (Gray 100 Dark Theme) + GSAP Animations
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";

/* ═══════════════════════════════════════════════════════════
   IBM Carbon G100 Design Tokens
═══════════════════════════════════════════════════════════ */
const C = {
  bg:          "#0d1117",
  bgLayer:     "#161b24",
  bgLayer2:    "#1e2530",
  bgHover:     "#21283a",
  gray100: "#161616", gray90: "#262626", gray80: "#393939",
  gray70:  "#525252",  gray60: "#6f6f6f", gray50: "#8d8d8d",
  gray40:  "#a8a8a8",  gray30: "#c6c6c6", gray20: "#e0e0e0",
  gray10:  "#f4f4f4",  white:  "#ffffff",
  blue60:  "#0f62fe", blue50: "#4589ff", blue40: "#78a9ff",
  cyan50:  "#1192e8", cyan40: "#33b1ff", cyan30: "#82cfff",
  cyan20:  "#bae6ff", cyan10: "#e5f6ff",
  teal40:  "#3ddbd9", teal50: "#009d9a",
  red60:    "#da1e28", red40:    "#ff8389",
  green50:  "#24a148", green40:  "#42be65",
  yellow30: "#f1c21b", orange40: "#ff832b",
  purple40: "#be95ff",
  border:   "rgba(51,177,255,0.10)",
  borderMd: "rgba(51,177,255,0.18)",
  borderHi: "rgba(51,177,255,0.35)",
};

/* ═══════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════ */
type ReportType   = "E-SitRep (Situation Report)" | "Weekly Analysis" | "Threat Assessment" | "Financial Fraud Report";
type FormatType   = "PDF" | "Word (DOCX)" | "Excel (XLSX)";
type ReportStatus = "ready" | "generating" | "failed";

interface GeneratedReport {
  id:        string;
  title:     string;
  type:      ReportType;
  format:    FormatType;
  generated: string;
  status:    ReportStatus;
  size:      string;
}

const REPORT_TYPES: ReportType[] = [
  "E-SitRep (Situation Report)",
  "Weekly Analysis",
  "Threat Assessment",
  "Financial Fraud Report",
];
const FORMAT_TYPES: FormatType[] = ["PDF", "Word (DOCX)", "Excel (XLSX)"];

const FORMAT_ICON: Record<FormatType, string> = {
  "PDF": "📄", "Word (DOCX)": "📝", "Excel (XLSX)": "📊",
};
const TYPE_COLOR: Record<ReportType, string> = {
  "E-SitRep (Situation Report)": C.cyan40,
  "Weekly Analysis":             C.teal40,
  "Threat Assessment":           C.orange40,
  "Financial Fraud Report":      C.purple40,
};

/* ═══════════════════════════════════════════════════════════
   SVG Icons
═══════════════════════════════════════════════════════════ */
const Svg = (p: React.SVGProps<SVGSVGElement>) => (
  <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" {...p} />
);
const DownloadIcon = () => (
  <Svg><path d="M26 15l-1.41-1.41L17 21.17V2h-2v19.17l-7.59-7.58L6 15l10 10 10-10zM6 26h20v2H6z" /></Svg>
);
const DocumentIcon = () => (
  <Svg><path d="M25.7 9.3l-7-7A1 1 0 0018 2H8a2 2 0 00-2 2v24a2 2 0 002 2h16a2 2 0 002-2V10a1 1 0 00-.3-.7zM18 4.41L23.59 10H18zM24 28H8V4h8v8h8z" /></Svg>
);
const ErrorIcon = () => (
  <Svg><path d="M16 2a14 14 0 100 28A14 14 0 0016 2zm-1 6h2v10h-2zm1 16a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" /></Svg>
);
const CloseIcon = () => (
  <Svg><path d="M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6 17.4 16 24 9.4z" /></Svg>
);
const SpinnerIcon = ({ spin }: { spin: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 32 32" fill={C.cyan40}
    style={{ animation: spin ? "cds-spin 0.8s linear infinite" : "none" }}>
    <path d="M16 4a12 12 0 100 24A12 12 0 0016 4zm0 2a10 10 0 110 20A10 10 0 0116 6z"
      fill="rgba(51,177,255,0.25)" />
    <path d="M28 16a12 12 0 01-12 12v-2a10 10 0 0010-10z" fill={C.cyan40} />
  </svg>
);
const ChevronIcon = ({ open }: { open: boolean }) => (
  <Svg style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms" }}>
    <path d="M16 22L6 12l1.41-1.41L16 19.17l8.59-8.58L26 12z" />
  </Svg>
);

/* ═══════════════════════════════════════════════════════════
   Portal Dropdown
   Renders at document.body — never clipped by any parent
═══════════════════════════════════════════════════════════ */
interface PortalDropdownProps<T extends string> {
  options:   T[];
  value:     T;
  anchorRef: React.RefObject<HTMLButtonElement>;
  onSelect:  (v: T) => void;
  onClose:   () => void;
}

function PortalDropdown<T extends string>({
  options, value, anchorRef, onSelect, onClose,
}: PortalDropdownProps<T>) {
  const [hovered, setHovered] = useState<T | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  /* Compute position relative to viewport + scroll */
  useEffect(() => {
    const update = () => {
      if (!anchorRef.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      setPos({
        top:   r.bottom + window.scrollY + 2,
        left:  r.left   + window.scrollX,
        width: r.width,
      });
    };
    update();
    window.addEventListener("resize",  update);
    window.addEventListener("scroll",  update, true);
    return () => {
      window.removeEventListener("resize",  update);
      window.removeEventListener("scroll",  update, true);
    };
  }, [anchorRef]);

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropRef.current   && !dropRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  /* GSAP entrance */
  useEffect(() => {
    if (dropRef.current) {
      gsap.fromTo(dropRef.current,
        { opacity: 0, y: -6, scaleY: 0.92, transformOrigin: "top" },
        { opacity: 1, y: 0,  scaleY: 1,    duration: 0.18, ease: "power2.out" }
      );
    }
  }, []);

  return createPortal(
    <div
      ref={dropRef}
      style={{
        position:  "absolute",
        top:       pos.top,
        left:      pos.left,
        width:     pos.width,
        background: "#1a2233",
        border:    `1px solid ${C.borderMd}`,
        zIndex:    99999,
        boxShadow: "0 8px 32px rgba(0,0,0,0.72)",
        overflow:  "hidden",
      }}
    >
      {options.map(opt => (
        <button
          key={opt}
          onMouseEnter={() => setHovered(opt)}
          onMouseLeave={() => setHovered(null)}
          /* onMouseDown prevents blur firing before onClick */
          onMouseDown={e => { e.preventDefault(); onSelect(opt); onClose(); }}
          style={{
            display:       "block",
            width:         "100%",
            padding:       "11px 16px",
            fontFamily:    "'IBM Plex Sans', sans-serif",
            fontSize:      14,
            cursor:        "pointer",
            border:        "none",
            borderLeft:    `2px solid ${opt === value ? C.cyan40 : "transparent"}`,
            textAlign:     "left",
            letterSpacing: "0.16px",
            whiteSpace:    "nowrap",
            outline:       "none",
            transition:    "background 80ms, color 80ms",
            background:    opt === value
              ? "rgba(51,177,255,0.12)"
              : hovered === opt
                ? "rgba(255,255,255,0.05)"
                : "transparent",
            color: opt === value ? C.cyan30 : C.gray20,
          }}
        >
          {opt}
        </button>
      ))}
    </div>,
    document.body,
  );
}

/* ═══════════════════════════════════════════════════════════
   CarbonSelect
═══════════════════════════════════════════════════════════ */
interface SelectProps<T extends string> {
  label:     string;
  value:     T;
  options:   T[];
  onChange:  (v: T) => void;
  disabled?: boolean;
}

function CarbonSelect<T extends string>({ label, value, options, onChange, disabled }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const triggerRef      = useRef<HTMLButtonElement>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={s.label}>{label}</label>
      <button
        ref={triggerRef}
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          ...s.selectTrigger,
          opacity:     disabled ? 0.5 : 1,
          cursor:      disabled ? "not-allowed" : "pointer",
          borderColor: open ? C.cyan40 : C.border,
          boxShadow:   open ? `0 0 0 1px ${C.cyan40}` : "none",
        }}
      >
        <span style={{ flex: 1, textAlign: "left", color: C.gray20, fontSize: 14 }}>{value}</span>
        <span style={{ color: C.gray50 }}><ChevronIcon open={open} /></span>
      </button>

      {open && (
        <PortalDropdown<T>
          options={options}
          value={value}
          anchorRef={triggerRef}
          onSelect={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Generate Button
═══════════════════════════════════════════════════════════ */
const GenerateButton: React.FC<{ loading: boolean; onClick: () => void }> = ({ loading, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    if (loading) return;
    gsap.timeline()
      .to(btnRef.current, { scale: 0.96, duration: 0.08, ease: "power1.in" })
      .to(btnRef.current, { scale: 1,    duration: 0.2,  ease: "elastic.out(1,0.5)" });
    onClick();
  };

  return (
    <button
      ref={btnRef}
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      style={{
        height: 48, padding: "0 24px",
        background: loading ? "rgba(51,177,255,0.08)" : hovered ? "#1d74ff" : C.blue60,
        border:     loading ? `1px solid rgba(51,177,255,0.25)` : "none",
        color:      loading ? C.cyan40 : C.white,
        cursor:     loading ? "not-allowed" : "pointer",
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 14, fontWeight: 500, letterSpacing: "0.16px",
        display: "flex", alignItems: "center", gap: 10,
        transition: "background 120ms, color 120ms",
        whiteSpace: "nowrap", borderRadius: 0, outline: "none",
      }}
    >
      <span>{loading ? "Generating..." : "Generate Report"}</span>
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════
   Report Row
═══════════════════════════════════════════════════════════ */
interface RowProps {
  report:   GeneratedReport;
  index:    number;
  onCancel: (id: string) => void;
  onClear:  (id: string) => void;
}

const ReportRow: React.FC<RowProps> = ({ report, index, onCancel, onClear }) => {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const [hov,    setHov]    = useState(false);
  const [dlHov,  setDlHov]  = useState(false);
  const [clrHov, setClrHov] = useState(false);

  useEffect(() => {
    gsap.fromTo(rowRef.current,
      { opacity: 0, x: -12 },
      { opacity: 1, x: 0, duration: 0.35, delay: index * 0.07, ease: "power2.out" }
    );
  }, [index]);

  const animateRemove = (cb: () => void) => {
    gsap.to(rowRef.current, {
      opacity: 0, x: 20, height: 0,
      duration: 0.25, ease: "power2.in", onComplete: cb,
    });
  };

  const typeColor = TYPE_COLOR[report.type];
  const date      = new Date(report.generated);
  const dateStr   = date.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
  const timeStr   = date.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });

  const btn = (extra: CSSProperties): CSSProperties => ({
    display:"inline-flex", alignItems:"center", gap:6,
    cursor:"pointer", padding:"6px 12px", background:"transparent",
    fontFamily:"'IBM Plex Sans',sans-serif", fontSize:12,
    letterSpacing:"0.16px", borderRadius:0,
    transition:"all 120ms", outline:"none",
    ...extra,
  });

  return (
    <tr
      ref={rowRef}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:   hov ? "rgba(51,177,255,0.04)" : "transparent",
        borderBottom: `1px solid ${C.border}`,
        transition:   "background 100ms",
      }}
    >
      <td style={s.td}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ color:typeColor, flexShrink:0 }}><DocumentIcon /></span>
          <div>
            <div style={{ color:C.gray10, fontSize:13, fontWeight:500, marginBottom:2 }}>{report.title}</div>
            <div style={{ color:C.gray60, fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }}>
              #{report.id.slice(-8).toUpperCase()}
            </div>
          </div>
        </div>
      </td>

      <td style={s.td}>
        <span style={{
          fontFamily:"'IBM Plex Mono',monospace", fontSize:11,
          color:typeColor, background:`${typeColor}18`,
          border:`1px solid ${typeColor}35`,
          padding:"2px 8px", borderRadius:2, letterSpacing:"0.16px", whiteSpace:"nowrap",
        }}>
          {report.type}
        </span>
      </td>

      <td style={s.td}>
        <span style={{ color:C.gray30, fontSize:13, display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:14 }}>{FORMAT_ICON[report.format]}</span>
          {report.format}
        </span>
      </td>

      <td style={s.td}>
        <div style={{ color:C.gray30, fontSize:12 }}>{dateStr}</div>
        <div style={{ color:C.gray60, fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }}>{timeStr}</div>
      </td>

      <td style={{ ...s.td, textAlign:"right" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:8 }}>

          {report.status === "generating" && <>
            <span style={{ color:C.cyan40, fontSize:12, display:"flex", alignItems:"center", gap:6 }}>
              <SpinnerIcon spin /> Processing
            </span>
            <button
              onMouseEnter={() => setClrHov(true)}
              onMouseLeave={() => setClrHov(false)}
              onClick={() => animateRemove(() => onCancel(report.id))}
              style={btn({
                border:`1px solid ${clrHov ? C.red40 : "rgba(255,131,137,0.3)"}`,
                color:C.red40,
                background: clrHov ? "rgba(255,131,137,0.1)" : "transparent",
              })}
            ><CloseIcon /> Cancel</button>
          </>}

          {report.status === "failed" && <>
            <span style={{ color:C.red40, fontSize:12, display:"flex", alignItems:"center", gap:6 }}>
              <ErrorIcon /> Failed
            </span>
            <button
              onMouseEnter={() => setClrHov(true)}
              onMouseLeave={() => setClrHov(false)}
              onClick={() => animateRemove(() => onClear(report.id))}
              style={btn({
                border:`1px solid ${clrHov ? C.red40 : "rgba(255,131,137,0.3)"}`,
                color:C.red40,
                background: clrHov ? "rgba(255,131,137,0.1)" : "transparent",
              })}
            ><CloseIcon /> Clear</button>
          </>}

          {report.status === "ready" && <>
            <button
              onMouseEnter={() => setDlHov(true)}
              onMouseLeave={() => setDlHov(false)}
              onClick={() => alert(`Downloading: ${report.title}`)}
              style={btn({
                border:`1px solid ${dlHov ? C.cyan40 : C.borderMd}`,
                color:C.cyan40,
                background: dlHov ? "rgba(51,177,255,0.1)" : "transparent",
              })}
            ><DownloadIcon /> Download</button>
            <button
              onMouseEnter={() => setClrHov(true)}
              onMouseLeave={() => setClrHov(false)}
              onClick={() => animateRemove(() => onClear(report.id))}
              style={btn({
                border:`1px solid ${clrHov ? "rgba(255,131,137,0.5)" : "rgba(255,255,255,0.08)"}`,
                color: clrHov ? C.red40 : C.gray50,
                background: clrHov ? "rgba(255,131,137,0.08)" : "transparent",
              })}
            ><CloseIcon /> Clear</button>
          </>}

        </div>
      </td>
    </tr>
  );
};

/* ═══════════════════════════════════════════════════════════
   Empty State
═══════════════════════════════════════════════════════════ */
const EmptyState: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    gsap.fromTo(ref.current, { opacity:0, y:10 }, { opacity:1, y:0, duration:0.5, ease:"power2.out" });
  }, []);
  return (
    <tr><td colSpan={5}>
      <div ref={ref} style={s.emptyState}>
        <div style={{
          width:48, height:48, borderRadius:"50%",
          background:"rgba(51,177,255,0.06)", border:`1px solid ${C.border}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          margin:"0 auto 14px", color:C.gray60,
        }}><DocumentIcon /></div>
        <div style={{ color:C.gray50, fontFamily:"'IBM Plex Mono',monospace", fontSize:12, letterSpacing:"0.32px" }}>
          No reports generated yet.
        </div>
        <div style={{ color:C.gray70, fontSize:11, marginTop:6 }}>
          Select a report type and format, then click Generate Report.
        </div>
      </div>
    </td></tr>
  );
};

/* ═══════════════════════════════════════════════════════════
   Progress Bar
═══════════════════════════════════════════════════════════ */
const ProgressBar: React.FC<{ active: boolean }> = ({ active }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const tlRef  = useRef<gsap.core.Timeline | null>(null);
  useEffect(() => {
    if (active) {
      tlRef.current = gsap.timeline({ repeat:-1 })
        .fromTo(barRef.current, { scaleX:0, transformOrigin:"left" }, { scaleX:0.7, duration:1.8, ease:"power1.inOut" })
        .to(barRef.current, { scaleX:1, duration:0.6, ease:"power1.in" })
        .set(barRef.current, { scaleX:0 });
    } else {
      tlRef.current?.kill();
      gsap.to(barRef.current, { scaleX:0, duration:0.2 });
    }
    return () => { tlRef.current?.kill(); };
  }, [active]);
  return (
    <div style={{ height:2, background:"rgba(51,177,255,0.08)", overflow:"hidden", flexShrink:0 }}>
      <div ref={barRef} style={{ height:"100%", background:C.cyan40, transformOrigin:"left", transform: "scaleX(0)" }} />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   Main ReportsPage
═══════════════════════════════════════════════════════════ */
const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>("E-SitRep (Situation Report)");
  const [format,     setFormat]     = useState<FormatType>("PDF");
  const [generating, setGenerating] = useState(false);
  const [reports,    setReports]    = useState<GeneratedReport[]>([]);

  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingIdRef = useRef<string | null>(null);
  const pageRef      = useRef<HTMLDivElement>(null);
  const headerRef    = useRef<HTMLDivElement>(null);
  const panelRef     = useRef<HTMLDivElement>(null);
  const tableRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline()
        .fromTo(headerRef.current, { opacity:0, y:-16 }, { opacity:1, y:0, duration:0.45, ease:"power3.out" })
        .fromTo(panelRef.current,  { opacity:0, y:14  }, { opacity:1, y:0, duration:0.4,  ease:"power2.out" }, "-=0.25")
        .fromTo(tableRef.current,  { opacity:0, y:14  }, { opacity:1, y:0, duration:0.4,  ease:"power2.out" }, "-=0.2");
    }, pageRef);
    return () => ctx.revert();
  }, []);

  const handleGenerate = useCallback(() => {
    if (generating) return;
    setGenerating(true);
    const id = crypto.randomUUID();
    pendingIdRef.current = id;
    setReports(prev => [{
      id,
      title:     `${reportType} — ${new Date().toLocaleDateString("en-GB")}`,
      type:      reportType,
      format,
      generated: new Date().toISOString(),
      status:    "generating",
      size:      "—",
    }, ...prev]);
    timerRef.current = setTimeout(() => {
      setReports(prev => prev.map(r => r.id === id
        ? { ...r, status:"ready", size:`${(Math.random()*3+0.8).toFixed(1)} MB` } : r
      ));
      setGenerating(false);
      pendingIdRef.current = null;
    }, 2500);
  }, [generating, reportType, format]);

  const handleCancel = useCallback((id: string) => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setReports(prev => prev.filter(r => r.id !== id));
    setGenerating(false);
    pendingIdRef.current = null;
  }, []);

  const handleClear    = useCallback((id: string) => setReports(p => p.filter(r => r.id !== id)), []);
  const handleClearAll = useCallback(() => setReports([]), []);

  return (
    <div ref={pageRef} style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        @keyframes cds-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes cds-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        * { box-sizing:border-box }
      `}</style>

      <div style={s.glowTopRight} />

      {/* Header */}
      <div ref={headerRef} style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>E-SitRep Generator</h1>
          <p style={s.pageSubtitle}>Generate and download structured intelligence reports</p>
        </div>
        <div style={s.headerMeta}>
          <span style={s.livePill}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:C.green40,
              animation:"cds-pulse 2s infinite", display:"inline-block" }} />
            LIVE
          </span>
        </div>
      </div>

      {/* Generate Panel */}
      <div ref={panelRef} style={s.panel}>
        <ProgressBar active={generating} />
        <div style={s.panelBody}>
          <h2 style={s.panelTitle}>Generate Intelligence Report</h2>
          <div style={s.formRow}>
            <div style={{ flex:"0 0 380px", minWidth:0 }}>
              <CarbonSelect<ReportType>
                label="REPORT TYPE" value={reportType}
                options={REPORT_TYPES} onChange={setReportType} disabled={generating}
              />
            </div>
            <div style={{ flex:"0 0 260px", minWidth:0 }}>
              <CarbonSelect<FormatType>
                label="FORMAT" value={format}
                options={FORMAT_TYPES} onChange={setFormat} disabled={generating}
              />
            </div>
            <div style={{ flex:1, display:"flex", alignItems:"flex-end", justifyContent:"flex-end" }}>
              <GenerateButton loading={generating} onClick={handleGenerate} />
            </div>
          </div>
          <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{
              width:8, height:8, borderRadius:1,
              background:TYPE_COLOR[reportType], display:"inline-block",
              boxShadow:`0 0 8px ${TYPE_COLOR[reportType]}60`,
            }} />
            <span style={{ color:C.gray50, fontSize:11, fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.32px" }}>
              {reportType.toUpperCase()} · {format}
            </span>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div ref={tableRef} style={s.tablePanel}>
        <div style={s.sectionLabel}>
          <span style={s.sectionText}>ALL REPORTS</span>
          {reports.length > 0 && <span style={s.reportCount}>{reports.length}</span>}
          {reports.length > 0 && (
            <button
              onClick={handleClearAll}
              style={{
                marginLeft:"auto", display:"inline-flex", alignItems:"center", gap:6,
                background:"transparent", border:`1px solid rgba(255,131,137,0.25)`,
                color:C.gray50, cursor:"pointer", padding:"4px 12px",
                fontFamily:"'IBM Plex Mono',sans-serif", fontSize:11,
                letterSpacing:"0.32px", borderRadius:0, outline:"none", transition:"all 120ms",
              }}
              onMouseEnter={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.color = C.red40; b.style.borderColor = C.red40;
                b.style.background = "rgba(255,131,137,0.08)";
              }}
              onMouseLeave={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.color = C.gray50; b.style.borderColor = "rgba(255,131,137,0.25)";
                b.style.background = "transparent";
              }}
            ><CloseIcon /> CLEAR ALL</button>
          )}
        </div>

        <table style={s.table}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.borderMd}` }}>
              {["TITLE","TYPE","FORMAT","GENERATED","ACTIONS"].map(col => (
                <th key={col} style={{ ...s.th, textAlign: col==="ACTIONS" ? "right" : "left" }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.length === 0
              ? <EmptyState />
              : reports.map((r,i) => (
                  <ReportRow key={r.id} report={r} index={i}
                    onCancel={handleCancel} onClear={handleClear} />
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   Styles
═══════════════════════════════════════════════════════════ */
const s: Record<string, CSSProperties> = {
  page: {
    minHeight:"100%", background:C.bg,
    fontFamily:"'IBM Plex Sans', sans-serif",
    padding:"40px 40px 60px",
    position:"relative", overflowX:"hidden",
  },
  glowTopRight: {
    position:"fixed", top:0, right:0, width:600, height:500,
    background:"radial-gradient(ellipse at 80% 0%,rgba(51,177,255,0.055) 0%,transparent 65%)",
    pointerEvents:"none", zIndex:0,
  },
  pageHeader: {
    position:"relative", zIndex:1,
    display:"flex", alignItems:"flex-start", justifyContent:"space-between",
    marginBottom:32,
  },
  pageTitle:    { margin:0, fontSize:28, fontWeight:300, color:C.white, letterSpacing:"-0.02em", lineHeight:1.2 },
  pageSubtitle: { margin:"6px 0 0", fontSize:13, color:C.gray60, letterSpacing:"0.16px" },
  headerMeta:   { display:"flex", alignItems:"center", gap:10 },
  livePill: {
    display:"inline-flex", alignItems:"center", gap:6,
    fontFamily:"'IBM Plex Mono',monospace", fontSize:10, fontWeight:600, letterSpacing:"0.32px",
    color:C.green40, background:"rgba(66,190,101,0.1)", border:"1px solid rgba(66,190,101,0.25)",
    padding:"3px 10px", borderRadius:2,
  },
  panel: {
    position:"relative", zIndex:1,
    background:C.bgLayer, border:`1px solid ${C.border}`,
    marginBottom:24,
    /* no overflow:hidden — portal still floats above everything */
  },
  panelBody:  { padding:"24px 28px 28px" },
  panelTitle: { margin:"0 0 20px", fontSize:15, fontWeight:500, color:C.gray20, letterSpacing:"0.1px" },
  formRow:    { display:"flex", alignItems:"flex-end", gap:16, flexWrap:"wrap" as const },
  label: {
    fontFamily:"'IBM Plex Sans',sans-serif", fontSize:11, fontWeight:600,
    letterSpacing:"0.32px", color:C.gray50,
    textTransform:"uppercase" as const, userSelect:"none" as const,
  },
  selectTrigger: {
    height:48, padding:"0 16px", background:C.bgLayer2,
    border:`1px solid ${C.border}`, color:C.gray20, cursor:"pointer",
    fontFamily:"'IBM Plex Sans',sans-serif", fontSize:14,
    display:"flex", alignItems:"center", gap:8, width:"100%",
    outline:"none", transition:"border-color 120ms, box-shadow 120ms", borderRadius:0,
  },
  sectionLabel: {
    display:"flex", alignItems:"center", gap:10,
    padding:"14px 20px 10px", borderBottom:`1px solid ${C.border}`,
  },
  sectionText: {
    fontFamily:"'IBM Plex Mono',monospace", fontSize:11, fontWeight:600,
    letterSpacing:"0.32px", color:C.gray60, userSelect:"none" as const,
  },
  reportCount: {
    fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:C.cyan40,
    background:"rgba(51,177,255,0.1)", border:"1px solid rgba(51,177,255,0.2)",
    padding:"1px 7px", borderRadius:10,
  },
  tablePanel: {
    position:"relative", zIndex:1,
    background:C.bgLayer, border:`1px solid ${C.border}`, overflow:"hidden",
  },
  table:  { width:"100%", borderCollapse:"collapse" as const },
  th: {
    padding:"10px 16px", fontFamily:"'IBM Plex Mono',monospace",
    fontSize:11, fontWeight:600, letterSpacing:"0.32px", color:C.gray60,
    whiteSpace:"nowrap" as const, userSelect:"none" as const,
  },
  td:         { padding:"14px 16px", verticalAlign:"middle" as const, fontSize:13, color:C.gray30 },
  emptyState: { padding:"56px 24px", textAlign:"center" as const },
};

export default ReportsPage;