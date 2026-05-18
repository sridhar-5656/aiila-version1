/**
 * ILA Intelligence Registry — Search Page
 * Fully wired to FastAPI GET /api/v1/search
 *
 * API response shape (from search_router in endpoints.py):
 * {
 *   query: string,
 *   page: number, page_size: number, total_results: number, total_pages: number,
 *   items: Array<EntityItem | AlertItem | EventItem>
 * }
 *
 * EntityItem: { kind:'entity', score, id, entity_type, primary_identifier, risk_score, risk_level }
 * AlertItem:  { kind:'alert',  score, id, title, risk_score, status }
 * EventItem:  { kind:'event',  score, id, snippet, platform, published_at }
 */

import React, { useState, useCallback, useEffect, useRef, HTMLProps } from 'react';
import { gsap } from 'gsap';
import client from '../api/client'; // axios instance — base URL already set
import { SearchResult, SearchMeta, SearchResponse } from '../types';

/* ─────────────────────────────────────────────────────────────────────────────
   CARBON g100 DESIGN TOKENS
───────────────────────────────────────────────────────────────────────────── */
const C = {
  bgBase:            '#161616',
  bgLayer1:          '#262626',
  bgLayer2:          '#393939',
  bgLayer3:          '#525252',
  bgHover:           '#2e2e2e',
  interactive:       '#0f62fe',
  interactiveHover:  '#0353e9',
  textPrimary:       '#ffffff',
  textSecondary:     '#e0e0e0',
  textHelper:        '#c6c6c6',
  textDisabled:      '#8d8d8d',
  textOnColor:       '#ffffff',
  borderStrong:      '#8d8d8d',
  borderSubtle:      '#525252',
  supportError:      '#ff4d4d',
  supportWarning:    '#f1c21b',
  supportSuccess:    '#42be65',
  supportInfo:       '#4589ff',
};

/* ─────────────────────────────────────────────────────────────────────────────
   KIND CONFIG — maps API "kind" values to display properties
───────────────────────────────────────────────────────────────────────────── */
const KIND = {
  entity: { color: C.interactive,   accent: '#0f62fe22', label: 'ENTITY', icon: '◈' },
  alert:  { color: C.supportError,  accent: '#ff4d4d18', label: 'ALERT',  icon: '⬡' },
  event:  { color: C.textHelper,    accent: '#c6c6c610', label: 'EVENT',  icon: '◎' },
};

/* ─────────────────────────────────────────────────────────────────────────────
   RISK HELPERS — aligned with FastAPI RiskLevel enum: critical/high/medium/low
───────────────────────────────────────────────────────────────────────────── */
const RISK_MAP = {
  critical: { color: '#ff4d4d', label: 'CRITICAL' },
  high:     { color: '#ff832b', label: 'HIGH'     },
  medium:   { color: '#f1c21b', label: 'MEDIUM'   },
  low:      { color: '#42be65', label: 'LOW'       },
} as const;

const getRisk = (score: number, level?: string): { color: string; label: string } => {
  if (level && RISK_MAP[String(level).toLowerCase() as keyof typeof RISK_MAP]) return RISK_MAP[String(level).toLowerCase() as keyof typeof RISK_MAP];
  if (score >= 80) return RISK_MAP.critical;
  if (score >= 60) return RISK_MAP.high;
  if (score >= 40) return RISK_MAP.medium;
  return RISK_MAP.low;
};

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
const redact = (text = '') =>
  String(text).replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '[ID REDACTED]');

const fmtDate = (iso?: string): string | null => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtTime = () =>
  new Date().toLocaleTimeString('en-IN', { hour12: false });

/* ─────────────────────────────────────────────────────────────────────────────
   NORMALISE API ITEMS
   Single place to adapt API shapes into unified display objects.
   entity_type, primary_identifier, title, status, snippet, platform, published_at
   all come from the FastAPI search endpoint exactly as defined in endpoints.py.
───────────────────────────────────────────────────────────────────────────── */
const normalise = (item: any): SearchResult => {
  const base = {
    kind:       item.kind,
    score:      item.score ?? 0,
    id:         item.id,
    riskScore:  item.risk_score,
    riskLevel:  item.risk_level,
  };
  if (item.kind === 'entity') return {
    ...base,
    title:       redact(item.primary_identifier),
    badge:       item.entity_type,
    snippet:     null,
    platform:    null,
    publishedAt: null,
    status:      null,
    navigateTo:  `/entity/${item.id}`,
  };
  if (item.kind === 'alert') return {
    ...base,
    title:       redact(item.title),
    badge:       item.status,
    snippet:     null,
    platform:    null,
    publishedAt: null,
    status:      item.status,
    navigateTo:  `/alert/${item.id}`,
  };
  return {
    ...base,
    title:       `Event · ${item.platform || 'UNKNOWN SOURCE'}`,
    badge:       item.platform,
    snippet:     redact(item.snippet),
    platform:    item.platform,
    publishedAt: item.published_at,
    status:      null,
    navigateTo:  `/event/${item.id}`,
  };
};

/* ─────────────────────────────────────────────────────────────────────────────
   API CALL — GET /api/v1/search
───────────────────────────────────────────────────────────────────────────── */
const searchAPI = async (q: string, page = 1, pageSize = 20): Promise<SearchResponse> => {
  const { data } = await client.get('/api/v1/search', {
    params: { q, page, page_size: pageSize },
  });
  return {
    items:      (data.items || []).map(normalise),
    total:      data.total_results ?? 0,
    totalPages: data.total_pages ?? 1,
    query:      data.query,
  };
};

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────────────────────── */

function Scanlines() {
  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
      backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)',
    }} />
  );
}

function StatusBar({ meta }: { meta?: SearchMeta | null }) {
  const [tick, setTick] = useState(fmtTime());
  useEffect(() => {
    const id = setInterval(() => setTick(fmtTime()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
      padding: '0.5rem 0', marginBottom: '1.5rem',
      borderBottom: `1px solid ${C.borderSubtle}`,
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '0.6875rem', color: C.textHelper, letterSpacing: '0.08em',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: C.supportSuccess, display: 'inline-block',
          boxShadow: `0 0 5px ${C.supportSuccess}`,
        }} />
        REGISTRY ONLINE
      </span>
      <span>NODES: 4,291,337</span>
      <span>INDEX: LIVE · FTS: POSTGRES</span>
      {meta && (
        <span style={{ color: C.textSecondary }}>
          QUERY <span style={{ color: C.interactive }}>"{meta.query}"</span>
          {' '}→ {meta.total} RESULT{meta.total !== 1 ? 'S' : ''}
          {meta.totalPages > 1 && ` · PAGE ${meta.page}/${meta.totalPages}`}
        </span>
      )}
      <span style={{ marginLeft: 'auto' }}>{tick} IST</span>
    </div>
  );
}

function SearchInput({ value, onChange, onSearch, loading }: { value: string; onChange: (value: string) => void; onSearch: (value: string) => void; loading: boolean }) {
  const borderRef = useRef(null);
  return (
    <div style={{ position: 'relative', maxWidth: 800, marginBottom: '0.25rem' }}>
      <span style={{
        position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
        color: C.textHelper, fontSize: '1.1rem', pointerEvents: 'none', zIndex: 2,
      }}>⌕</span>

      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSearch(value)}
        onFocus={() => gsap.to(borderRef.current, { scaleX: 1, duration: 0.3, ease: 'power2.out' })}
        onBlur={() => !value && gsap.to(borderRef.current, { scaleX: 0, duration: 0.25 })}
        placeholder="Query by phone · UPI ID · social alias · alert ID · entity name..."
        style={{
          width: '100%', boxSizing: 'border-box',
          height: '3rem', padding: '0 6rem 0 2.75rem',
          background: C.bgLayer1,
          border: `1px solid ${C.borderSubtle}`, borderBottom: 'none',
          color: C.textPrimary,
          fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.875rem',
          outline: 'none', transition: 'background 0.15s',
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLInputElement>) => e.currentTarget.style.background = C.bgHover}
        onMouseLeave={(e: React.MouseEvent<HTMLInputElement>) => e.currentTarget.style.background = C.bgLayer1}
      />

      {/* Carbon blue bottom-border focus line */}
      <div ref={borderRef} style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: C.interactive, zIndex: 3,
        transform: value ? 'scaleX(1)' : 'scaleX(0)', transformOrigin: 'left',
        transition: 'transform 0.25s ease',
      }} />

      {value && (
        <button onClick={() => onChange('')} style={{
          position: 'absolute', right: '3rem', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', color: C.textHelper,
          cursor: 'pointer', fontSize: '1rem', padding: '0.25rem', zIndex: 2,
        }}>✕</button>
      )}

      <button
        onClick={() => onSearch(value)}
        disabled={loading}
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '3rem',
          background: loading ? C.bgLayer2 : C.interactive,
          border: 'none', cursor: loading ? 'wait' : 'pointer',
          color: C.textOnColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', transition: 'background 0.15s', zIndex: 2,
        }}
        onMouseEnter={e => !loading && (e.currentTarget.style.background = C.interactiveHover)}
        onMouseLeave={e => !loading && (e.currentTarget.style.background = C.interactive)}
      >
        {loading
          ? <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation: 'spin 0.7s linear infinite' }}>
              <circle cx="8" cy="8" r="6" fill="none" stroke={C.borderSubtle} strokeWidth="1.5" />
              <path d="M8 2 A6 6 0 0 1 14 8" fill="none" stroke={C.textOnColor} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          : '→'
        }
      </button>
    </div>
  );
}

function SearchHint({ loading }: { loading: boolean }) {
  return (
    <p style={{
      fontSize: '0.75rem', color: loading ? C.interactive : C.textHelper,
      fontFamily: loading ? 'IBM Plex Mono, monospace' : 'IBM Plex Sans, sans-serif',
      letterSpacing: loading ? '0.1em' : 'normal',
      marginTop: '0.375rem', marginBottom: '2rem',
      transition: 'color 0.2s',
    }}>
      {loading
        ? '▸ PARSING GLOBAL INTELLIGENCE NODES — QUERYING POSTGRES FTS...'
        : 'Press Enter or → · searches entities, alerts, and events via plainto_tsquery'
      }
    </p>
  );
}

// Filter + sort toolbar — client-side after API returns
function Toolbar({ filter, onFilter, sortBy, onSort, total, displayed }: { filter: string; onFilter: (f: string) => void; sortBy: string; onSort: (s: string) => void; total: number; displayed: number }) {
  const kinds = ['all', 'entity', 'alert', 'event'];
  const sorts = [{ value: 'score', label: 'Relevance' }, { value: 'risk_score', label: 'Risk Score' }];

  const pill = (active: boolean) => ({
    padding: '0.25rem 0.75rem',
    fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.5625rem',
    letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
    border: `1px solid ${active ? C.interactive : C.borderSubtle}`,
    background: active ? `${C.interactive}22` : 'none',
    color: active ? C.interactive : C.textHelper,
    transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.5625rem', color: C.textDisabled, letterSpacing: '0.1em', marginRight: 4 }}>FILTER</span>
      {kinds.map(k => <button key={k} onClick={() => onFilter(k)} style={pill(filter === k)}>{k}</button>)}
      <span style={{ flex: 1 }} />
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.5625rem', color: C.textDisabled, letterSpacing: '0.1em' }}>SORT</span>
      {sorts.map(s => <button key={s.value} onClick={() => onSort(s.value)} style={pill(sortBy === s.value)}>{s.label}</button>)}
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.5625rem', color: C.textDisabled, marginLeft: 8 }}>
        {displayed}/{total}
      </span>
    </div>
  );
}

function RiskMeter({ score, level }: { score?: number; level?: string }) {
  if (score === undefined && !level) return null;
  const risk = getRisk(score ?? 0, level);
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: '1.875rem', fontWeight: 600, lineHeight: 1,
        color: risk.color, fontFamily: 'IBM Plex Mono, monospace',
        textShadow: `0 0 10px ${risk.color}44`,
      }}>
        {score ?? '—'}
      </div>
      <div style={{
        fontSize: '0.5rem', letterSpacing: '0.12em', marginTop: 3,
        color: risk.color, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase',
      }}>
        {risk.label}
      </div>
      <div style={{ marginTop: 5, width: 52, height: 2, background: C.bgLayer3, margin: '5px auto 0' }}>
        <div style={{ width: `${score ?? 50}%`, maxWidth: '100%', height: '100%', background: risk.color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

function KindTag({ kind }: { kind: string }) {
  const cfg = KIND[kind as keyof typeof KIND] || KIND.event;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '0.125rem 0.5rem',
      background: cfg.accent, border: `1px solid ${cfg.color}44`,
      color: cfg.color, fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '0.5625rem', letterSpacing: '0.12em',
    }}>
      <span style={{ fontSize: '0.75rem' }}>{cfg.icon}</span> {cfg.label}
    </span>
  );
}

function BadgeTag({ label, color }: { label?: string; color?: string }) {
  if (!label) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0.125rem 0.5rem',
      background: color ? `${color}18` : C.bgLayer2,
      border: `1px solid ${color ? `${color}44` : C.borderSubtle}`,
      color: color || C.textSecondary,
      fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.5625rem',
      letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>
      {label}
    </span>
  );
}

// Maps FastAPI AlertStatus enum values to colors
const STATUS_COLOR = {
  new:           C.supportInfo,
  under_review:  C.supportWarning,
  investigating: C.supportWarning,
  confirmed:     C.supportError,
  dismissed:     C.textDisabled,
  resolved:      C.supportSuccess,
} as const;

function ResultTile({ item, onInvestigate }: { item: SearchResult; onInvestigate: (item: SearchResult) => void }) {
  const cfg    = KIND[item.kind as keyof typeof KIND] || KIND.event;
  const ref    = useRef<HTMLDivElement>(null);
  const sColor = STATUS_COLOR[String(item.status || '').toLowerCase() as keyof typeof STATUS_COLOR];

  const enter = () => {
    gsap.to(ref.current, { x: 4, duration: 0.18, ease: 'power2.out' });
    if (ref.current) { ref.current.style.borderLeftColor = cfg.color; ref.current.style.borderLeftWidth = '4px'; }
  };
  const leave = () => {
    gsap.to(ref.current, { x: 0, duration: 0.18, ease: 'power2.in' });
    if (ref.current) { ref.current.style.borderLeftColor = `${cfg.color}66`; ref.current.style.borderLeftWidth = '3px'; }
  };

  return (
    <div
      ref={ref}
      className="ila-tile"
      onMouseEnter={enter}
      onMouseLeave={leave}
      style={{
        display: 'flex', alignItems: 'stretch',
        background: C.bgLayer1,
        border: `1px solid ${C.borderSubtle}`,
        borderLeft: `3px solid ${cfg.color}66`,
        willChange: 'transform', transition: 'border-color 0.15s',
      }}
    >
      {/* Accent column */}
      <div style={{
        width: 48, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: cfg.accent, borderRight: `1px solid ${cfg.color}18`,
        fontSize: '1.1rem', color: cfg.color,
      }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '1rem 1.25rem', minWidth: 0 }}>
        {/* Tags row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <KindTag kind={item.kind} />
          {item.badge && <BadgeTag label={item.badge} color={sColor} />}
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.5rem', color: C.textDisabled }}>
            REL {Math.round((item.score || 0) * 100)}%
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.5rem', color: C.textDisabled }}>
            {String(item.id).slice(0, 8).toUpperCase()}
          </span>
        </div>

        {/* Title */}
        <h4 style={{
          color: C.textPrimary, fontWeight: 600, fontSize: '0.9375rem',
          margin: '0 0 0.375rem', fontFamily: 'IBM Plex Sans, sans-serif',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.title || 'Untitled Intelligence Record'}
        </h4>

        {/* Snippet (event kind only) */}
        {item.snippet && (
          <p style={{
            color: C.textSecondary, fontSize: '0.8125rem', lineHeight: 1.55,
            margin: '0 0 0.625rem', fontFamily: 'IBM Plex Sans, sans-serif',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {item.snippet}
          </p>
        )}

        {/* Meta */}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          {item.platform && (
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.625rem', color: C.textHelper }}>
              SRC <span style={{ color: C.textSecondary }}>{item.platform}</span>
            </span>
          )}
          {item.publishedAt && (
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.625rem', color: C.textHelper }}>
              TS <span style={{ color: C.textSecondary }}>{fmtDate(item.publishedAt)}</span>
            </span>
          )}
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.625rem', color: C.textHelper }}>
            KIND <span style={{ color: cfg.color }}>{item.kind.toUpperCase()}</span>
          </span>
        </div>
      </div>

      {/* Risk panel */}
      <div style={{
        flexShrink: 0, minWidth: 130,
        borderLeft: `1px solid ${C.borderSubtle}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem',
      }}>
        <RiskMeter score={item.riskScore} level={item.riskLevel} />
        <button
          onClick={() => onInvestigate(item)}
          style={{
            background: 'none', border: `1px solid ${cfg.color}`,
            color: cfg.color, padding: '0.3rem 0.75rem',
            fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.6875rem',
            cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = cfg.color; e.currentTarget.style.color = C.textOnColor; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = cfg.color; }}
        >
          Investigate →
        </button>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <>
      <style>{`@keyframes skelPulse{0%{opacity:0.4}100%{opacity:0.75}}`}</style>
      {[0.9, 1.05, 1.2].map((d, i) => (
        <div key={i} style={{
          height: 96, background: C.bgLayer1,
          border: `1px solid ${C.borderSubtle}`,
          borderLeft: `3px solid ${C.bgLayer3}`,
          animation: `skelPulse ${d}s ease-in-out infinite alternate`,
        }} />
      ))}
    </>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) return null;
  const btn = (label: string, target: number, disabled: boolean) => (
    <button
      key={label}
      onClick={() => !disabled && onPage(target)}
      disabled={disabled}
      style={{
        padding: '0.3rem 0.75rem', background: 'none',
        border: `1px solid ${disabled ? C.bgLayer3 : C.borderSubtle}`,
        color: disabled ? C.textDisabled : C.textSecondary,
        fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.625rem',
        cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s', letterSpacing: '0.06em',
      }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.borderColor = C.interactive)}
      onMouseLeave={e => !disabled && (e.currentTarget.style.borderColor = C.borderSubtle)}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: '1.5rem' }}>
      {btn('← PREV', page - 1, page <= 1)}
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.625rem', color: C.textHelper, padding: '0 0.5rem' }}>
        {page} / {totalPages}
      </span>
      {btn('NEXT →', page + 1, page >= totalPages)}
    </div>
  );
}

function Empty({ query }: { query: string }) {
  return (
    <div style={{ border: `1px dashed ${C.borderSubtle}`, padding: '3rem', textAlign: 'center', background: C.bgLayer1 }}>
      <div style={{ fontSize: '2rem', color: C.textDisabled, marginBottom: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>◫</div>
      <p style={{ color: C.textHelper, fontSize: '0.875rem', fontFamily: 'IBM Plex Sans, sans-serif', margin: 0 }}>
        Zero matches in active registry for <span style={{ color: C.textSecondary }}>"{query}"</span>
      </p>
      <p style={{ color: C.textDisabled, fontSize: '0.6875rem', marginTop: '0.5rem', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em' }}>
        TRY: different identifier · broader alias · entity UUID · alert title keyword
      </p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
      background: '#1a0000', border: `1px solid ${C.supportError}44`,
      borderLeft: `3px solid ${C.supportError}`,
      padding: '0.875rem 1rem', marginBottom: '1.25rem',
    }}>
      <span style={{ color: C.supportError, fontSize: '1rem', flexShrink: 0 }}>⬡</span>
      <div>
        <p style={{ fontWeight: 600, fontSize: '0.875rem', color: C.supportError, margin: 0 }}>Intelligence Layer Unreachable</p>
        <p style={{ fontSize: '0.8125rem', color: '#ff9999', marginTop: 3 }}>{message}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function IntelligenceRegistrySearch() {
  const [draftQuery, setDraftQuery] = useState('');
  const [query,      setQuery]      = useState('');
  const [results,    setResults]    = useState<SearchResult[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [meta,       setMeta]       = useState<SearchMeta | null>(null);
  const [page,       setPage]       = useState(1);
  const [filter,     setFilter]     = useState('all');
  const [sortBy,     setSortBy]     = useState('score');

  const headerRef = useRef(null);
  const statusRef = useRef(null);
  const searchRef = useRef(null);

  /* Entrance: only translate, never opacity */
  useEffect(() => {
    [headerRef, statusRef, searchRef].forEach(r => {
      if (r.current) gsap.set(r.current, { opacity: 1, visibility: 'visible' });
    });
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from(headerRef.current, { x: -20, duration: 0.55, clearProps: 'x' })
      .from(statusRef.current, { y: -6,  duration: 0.3,  clearProps: 'y' }, '-=0.2')
      .from(searchRef.current, { y: 10,  duration: 0.4,  clearProps: 'y' }, '-=0.15');
  }, []);

  /* Animate tiles: force opacity:1, only animate scale/y */
  useEffect(() => {
    if (!results.length) return;
    gsap.set('.ila-tile', { opacity: 1 });
    gsap.fromTo('.ila-tile',
      { y: 14, scaleY: 0.97 },
      { y: 0, scaleY: 1, stagger: 0.06, duration: 0.38, ease: 'back.out(1.2)', clearProps: 'y,scaleY' }
    );
  }, [results]);

  const executeSearch = useCallback(async (q: string, pg = 1) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await searchAPI(q, pg);
      setResults(res.items as SearchResult[]);
      setMeta({ query: res.query, total: res.total, totalPages: res.totalPages, page: pg });
      setPage(pg);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail || (err as any)?.message || 'Network failure — check API server';
      setError(msg);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (q: string) => {
    setQuery(q);
    setFilter('all');
    setSortBy('score');
    executeSearch(q, 1);
  };

  /* Client-side filter + sort to avoid extra round-trips */
  const displayed = results
    .filter(item => filter === 'all' || item.kind === filter)
    .sort((a, b) => sortBy === 'risk_score' ? (b.riskScore ?? 0) - (a.riskScore ?? 0) : b.score - a.score);

  const handleInvestigate = (item: SearchResult) => {
    window.location.href = item.navigateTo;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@300;400;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: ${C.interactive}; color: #fff; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bgBase}; }
        ::-webkit-scrollbar-thumb { background: ${C.borderSubtle}; }
      `}</style>

      <div style={{ minHeight: '100vh', background: C.bgBase, color: C.textPrimary, position: 'relative', fontFamily: 'IBM Plex Sans, sans-serif' }}>
        <Scanlines />
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '2.5rem 2rem', position: 'relative', zIndex: 1 }}>

          {/* HEADER */}
          <div ref={headerRef} style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.625rem', color: C.interactive, letterSpacing: '0.18em' }}>
                ILA OSINT · v0.1
              </span>
              <span style={{ width: 1, height: 12, background: C.borderSubtle }} />
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.625rem', color: C.textHelper, letterSpacing: '0.1em' }}>
                UNIFIED INTELLIGENCE SEARCH
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 300, lineHeight: 1.2, letterSpacing: '-0.01em', color: C.textPrimary }}>
              Intelligence{' '}
              <span style={{ fontWeight: 600, color: C.interactive }}>Registry</span>
            </h1>
            <p style={{ color: C.textHelper, marginTop: '0.5rem', fontSize: '0.875rem', maxWidth: 560, lineHeight: 1.6 }}>
              Full-text search across entities, alerts, and raw events.
              Powered by PostgreSQL <code style={{ fontFamily: 'IBM Plex Mono, monospace', color: C.textSecondary, fontSize: '0.8em' }}>plainto_tsquery</code> with ILIKE fallback.
            </p>
          </div>

          {/* STATUS BAR */}
          <div ref={statusRef}><StatusBar meta={meta} /></div>

          {/* SEARCH */}
          <div ref={searchRef}>
            <SearchInput value={draftQuery} onChange={setDraftQuery} onSearch={handleSearch} loading={loading} />
            <SearchHint loading={loading} />
          </div>

          {/* ERROR */}
          {error && <ErrorBanner message={error} />}

          {/* TOOLBAR */}
          {meta && !loading && results.length > 0 && (
            <Toolbar
              filter={filter} onFilter={setFilter}
              sortBy={sortBy}  onSort={setSortBy}
              total={results.length} displayed={displayed.length}
            />
          )}

          {/* RESULTS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {loading && <Skeleton />}
            {!loading && meta && results.length === 0 && !error && <Empty query={query} />}
            {!loading && displayed.map(item => (
              <ResultTile key={item.id} item={item} onInvestigate={handleInvestigate} />
            ))}
          </div>

          {/* PAGINATION */}
          {!loading && meta && (
            <Pagination page={page} totalPages={meta.totalPages} onPage={(pg) => executeSearch(query, pg)} />
          )}

          {/* FOOTER */}
          {!loading && results.length > 0 && (
            <div style={{
              marginTop: '2rem', paddingTop: '0.875rem',
              borderTop: `1px solid ${C.borderSubtle}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.5625rem', color: C.textDisabled, letterSpacing: '0.08em' }}>
                {displayed.length}/{meta?.total ?? 0} RECORDS · FILTER:{filter.toUpperCase()} · SORT:{sortBy.toUpperCase()} · CLASSIFICATION: RESTRICTED
              </span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.5625rem', color: C.textDisabled }}>
                /api/v1/search?q={encodeURIComponent(query)}&page={page}&page_size=20
              </span>
            </div>
          )}

        </div>
      </div>
    </>
  );
}