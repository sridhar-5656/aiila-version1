/**
 * AlertsPage.tsx — ILA Intelligence Platform
 * ─────────────────────────────────────────────────────────────────────────────
 * Full IBM Carbon Design System g100 implementation
 *
 * ✅ MOCK DATA MODE: Embedded directly — no API needed to develop/demo
 * ✅ AUTO-REFRESH:   Every 15 min a banner appears with 5 new live alerts
 *                   Clicking "Refresh now" (or waiting) merges them to top
 *
 * HOW IT WORKS:
 *   1. On load → tries FastAPI at API_BASE; if it fails → falls back to MOCK_ALERTS
 *   2. First 15 alerts shown from MOCK_ALERTS (page 1)
 *   3. Every 15 min → blue banner appears: "5 new alerts — Refresh now"
 *   4. On refresh → new batch (NEW_ALERTS_BATCH) prepended at top
 *   5. Infinite scroll still works using mock data pages
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
  CSSProperties,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   CARBON DESIGN TOKENS — g100 dark theme
═══════════════════════════════════════════════════════════════════════════ */
const C = {
  background:        '#161616',
  backgroundHover:   '#1e1e1e',
  layer01:           '#262626',
  layer02:           '#393939',
  layer03:           '#525252',
  layerHover01:      '#2e2e2e',
  layerHover02:      '#474747',
  layerActive01:     '#525252',
  layerAccent01:     '#393939',
  borderSubtle00:    '#393939',
  borderSubtle01:    '#525252',
  borderStrong01:    '#6f6f6f',
  borderInteractive: '#4589ff',
  textPrimary:     '#f4f4f4',
  textSecondary:   '#c6c6c6',
  textHelper:      '#8d8d8d',
  textPlaceholder: '#6f6f6f',
  textOnColor:     '#ffffff',
  textDisabled:    '#525252',
  textError:       '#ff8389',
  iconPrimary:   '#f4f4f4',
  iconSecondary: '#c6c6c6',
  iconDisabled:  '#525252',
  supportError:   '#fa4d56',
  supportWarning: '#f1c21b',
  supportSuccess: '#42be65',
  supportInfo:    '#4589ff',
  supportErrorBg:   '#2d0709',
  supportWarningBg: '#302400',
  supportSuccessBg: '#071908',
  supportInfoBg:    '#001d6c',
  interactive: '#4589ff',
  focus:       '#4589ff',
  linkPrimary: '#78a9ff',
  highlight:   '#002d9c',
  overlayBg: 'rgba(0,0,0,0.5)',
  tagRed:      { bg: '#a2191f', text: '#ffd7d9' },
  tagOrange:   { bg: '#8a3800', text: '#ffd9be' },
  tagYellow:   { bg: '#684e00', text: '#fce300' },
  tagGreen:    { bg: '#0e6027', text: '#a7f0ba' },
  tagTeal:     { bg: '#004144', text: '#9ef0f0' },
  tagBlue:     { bg: '#002d9c', text: '#a6c8ff' },
  tagPurple:   { bg: '#5a1ba9', text: '#d4bbff' },
  tagCoolGray: { bg: '#4d5358', text: '#dde1e6' },
  tagWarmGray: { bg: '#4b4441', text: '#f2f4f8' },
};

const T: Record<string, CSSProperties> = {
  label01:      { fontSize: 11, lineHeight: '16px', letterSpacing: '0.32px', fontWeight: 400 },
  label02:      { fontSize: 12, lineHeight: '16px', letterSpacing: '0.32px', fontWeight: 400 },
  helperText:   { fontSize: 12, lineHeight: '16px', letterSpacing: '0.32px', fontStyle: 'italic' },
  body01:       { fontSize: 14, lineHeight: '20px', letterSpacing: '0.16px', fontWeight: 400 },
  body02:       { fontSize: 16, lineHeight: '24px', letterSpacing: '0px',    fontWeight: 400 },
  code01:       { fontSize: 12, lineHeight: '16px', letterSpacing: '0.32px', fontFamily: "'IBM Plex Mono', monospace" },
  code02:       { fontSize: 14, lineHeight: '20px', letterSpacing: '0.32px', fontFamily: "'IBM Plex Mono', monospace" },
  heading01:    { fontSize: 14, lineHeight: '18px', letterSpacing: '0.16px', fontWeight: 600 },
  heading02:    { fontSize: 16, lineHeight: '22px', letterSpacing: '0px',    fontWeight: 600 },
  heading03:    { fontSize: 20, lineHeight: '28px', letterSpacing: '0px',    fontWeight: 400 },
  heading04:    { fontSize: 28, lineHeight: '36px', letterSpacing: '0px',    fontWeight: 400 },
  heading05:    { fontSize: 32, lineHeight: '40px', letterSpacing: '0px',    fontWeight: 300 },
  productive01: { fontSize: 12, lineHeight: '16px', letterSpacing: '0.32px', fontWeight: 600 },
};

/* ═══════════════════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════════════════════ */
const API_BASE  = 'http://127.0.0.1:8000';
const PAGE_SIZE = 15;  // Show 15 initially
/** 15 minutes in ms — auto-refresh interval */
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

const SEV_CFG: Record<string, { tag: { bg:string; text:string }; label:string; color:string; notifKind:string }> = {
  critical: { tag: C.tagRed,      label: 'Critical', color: C.supportError,   notifKind: 'error'   },
  high:     { tag: C.tagOrange,   label: 'High',     color: C.supportWarning, notifKind: 'warning' },
  medium:   { tag: C.tagBlue,     label: 'Medium',   color: C.supportInfo,    notifKind: 'info'    },
  low:      { tag: C.tagGreen,    label: 'Low',      color: C.supportSuccess, notifKind: 'success' },
  info:     { tag: C.tagCoolGray, label: 'Info',     color: C.textHelper,     notifKind: 'info'    },
};
const STAT_CFG: Record<string, { tag:{ bg:string; text:string }; label:string }> = {
  new:          { tag: C.tagRed,      label: 'New'           },
  under_review: { tag: C.tagYellow,   label: 'In review'     },
  investigating:{ tag: C.tagOrange,   label: 'Investigating'  },
  confirmed:    { tag: C.tagGreen,    label: 'Confirmed'      },
  dismissed:    { tag: C.tagCoolGray, label: 'Dismissed'      },
  resolved:     { tag: C.tagTeal,     label: 'Resolved'       },
};
const STATUS_TRANSITIONS: Record<string, Array<{ label:string; next:string; kind:'primary'|'secondary'|'danger'|'tertiary'|'ghost' }>> = {
  new:          [{ label:'Start review', next:'under_review',  kind:'primary'   }],
  under_review: [{ label:'Investigate',  next:'investigating', kind:'primary'   },
                 { label:'Confirm',      next:'confirmed',     kind:'secondary' },
                 { label:'Dismiss',      next:'dismissed',     kind:'tertiary'  }],
  investigating:[{ label:'Confirm',      next:'confirmed',     kind:'primary'   },
                 { label:'Dismiss',      next:'dismissed',     kind:'tertiary'  }],
  confirmed:    [{ label:'Dismiss',      next:'dismissed',     kind:'danger'    }],
  dismissed:    [{ label:'Reopen',       next:'new',           kind:'ghost'     }],
};
const RISK_LEVELS  = ['all','critical','high','medium','low','info'];
const ALERT_TYPES  = ['All types','Threat','Fraud','Terrorism','Entity','Narrative'];
const SORT_OPTIONS = [
  { value:'risk_score|desc', label:'Risk: High → Low' },
  { value:'risk_score|asc',  label:'Risk: Low → High' },
  { value:'created_at|desc', label:'Newest first'      },
  { value:'created_at|asc',  label:'Oldest first'      },
];

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */
interface Alert {
  id: string; entity_id: string; alert_type: string; title: string;
  description?: string; risk_score: number; risk_level: string; status: string;
  matched_pattern?: string; risk_factors: string[];
  evidence_data?: Record<string, unknown>; created_at: string; entity?: Entity;
}
interface Entity {
  id: string; entity_type: string; primary_identifier: string; display_name?: string;
  risk_score: number; risk_level: string; is_flagged: boolean; event_count: number; last_seen?: string;
}
interface AlertDetail extends Alert { analyst_note?: string; reviewed_at?: string; entity?: EntityDetail; }
interface EntityDetail extends Entity {
  influence_score: number; anomaly_score: number; sentiment_avg: number;
  first_seen?: string; investigation_notes?: string; risk_factors: string[];
  alert_count: number; aliases: Alias[];
}
interface Alias { id:string; alias_type:string; alias_value:string; platform?:string; confidence:number; is_verified:boolean; }
interface DashboardStats {
  total_entities:number; flagged_entities:number; alerts_today:number;
  critical_alerts:number; high_alerts:number; active_sources:number; events_today:number;
  top_risk_entities:Entity[]; alerts_last_24h_by_hour:Array<{hour:string;count:number}>;
}
interface ExplainData {
  overall_risk_score:number; risk_level:string; top_factors:string[];
  score_breakdown:Record<string,number>; formula:string; data_points:Record<string,unknown>;
}
interface TimelineEvent {
  id:string; timestamp:string; content:string; platform:string;
  author_handle?:string; sentiment_score?:number; url?:string;
  source?:{ id:string; name:string; tier:number };
}
interface Filters { risk_level:string; type:string; status:string; sort:string; }

/* ═══════════════════════════════════════════════════════════════════════════
   ██████╗  MOCK DATA  ██████╗
   ─────────────────────────────────────────────────────────────────────────
   All 40 initial alerts + 5 "new batch" alerts injected on each refresh.
   Replace MOCK_STATS / MOCK_ALERTS / NEW_ALERTS_BATCH with real API when ready.
═══════════════════════════════════════════════════════════════════════════ */
const MOCK_STATS: DashboardStats = {
  total_entities: 847, flagged_entities: 143, alerts_today: 38,
  critical_alerts: 12, high_alerts: 27, active_sources: 64, events_today: 1204,
  top_risk_entities: [],
  alerts_last_24h_by_hour: [
    {hour:'00:00',count:3},{hour:'01:00',count:1},{hour:'02:00',count:0},{hour:'03:00',count:2},
    {hour:'04:00',count:4},{hour:'05:00',count:2},{hour:'06:00',count:5},{hour:'07:00',count:7},
    {hour:'08:00',count:9},{hour:'09:00',count:11},{hour:'10:00',count:14},{hour:'11:00',count:12},
    {hour:'12:00',count:8},{hour:'13:00',count:10},{hour:'14:00',count:13},{hour:'15:00',count:7},
    {hour:'16:00',count:6},{hour:'17:00',count:9},{hour:'18:00',count:5},{hour:'19:00',count:4},
    {hour:'20:00',count:3},{hour:'21:00',count:2},{hour:'22:00',count:1},{hour:'23:00',count:2},
  ],
};

const MOCK_EXPLAIN: ExplainData = {
  overall_risk_score: 96, risk_level: 'critical',
  top_factors: ['Bot network','Cross-platform coordination','Extremist content','Rapid velocity','Known bad actor'],
  score_breakdown: { anomaly_detection:9.6, pattern_match:9.2, network_centrality:8.8, sentiment_signal:8.4, activity_velocity:9.0 },
  formula: 'risk_score = 0.35×anomaly + 0.25×pattern + 0.20×network + 0.12×sentiment + 0.08×velocity',
  data_points: { posts_24h:4821, unique_connections:2347, flagged_content_pct:0.78, sentiment_avg:-0.84 },
};

const MOCK_TIMELINE: TimelineEvent[] = [
  { id:'EVT-001', timestamp:'2024-12-15T14:20:00Z', content:'BREAKING: Sources confirm mass irregularities at 7 key polling stations. This is the fraud they don\'t want you to see. Share before it\'s deleted.', platform:'Twitter/X', author_handle:'@shadowprophet', sentiment_score:-0.92, url:'https://x.com/shadowprophet/status/1234567890', source:{id:'SRC-001',name:'Twitter Monitor',tier:1} },
  { id:'EVT-002', timestamp:'2024-12-15T13:45:00Z', content:'They shut down my last 3 accounts for telling the truth. They can\'t silence us all. The revolution is coming. Join the channel.', platform:'Telegram', author_handle:'shadowprophet_real', sentiment_score:-0.87, source:{id:'SRC-002',name:'Telegram Monitor',tier:2} },
  { id:'EVT-003', timestamp:'2024-12-15T12:30:00Z', content:'New video proving the deep state operatives at work. 47 accounts confirmed in the network. We have their names.', platform:'Rumble', author_handle:'ShadowProphet_Official', sentiment_score:-0.79, url:'https://rumble.com/v-shadow-001', source:{id:'SRC-003',name:'Alt-Platform Monitor',tier:3} },
  { id:'EVT-004', timestamp:'2024-12-15T11:15:00Z', content:'Coordinating with brothers and sisters in the network. Push the message at 14:00 sharp. All channels simultaneously.', platform:'Signal', sentiment_score:-0.65, source:{id:'SRC-004',name:'Encrypted Channel Monitor',tier:2} },
  { id:'EVT-005', timestamp:'2024-12-15T10:00:00Z', content:'Post reaches 2.1M impressions. Coordinated repost network activated. 47 amplifier accounts engaged within 3 minutes.', platform:'Intelligence Feed', source:{id:'SRC-005',name:'Network Analysis',tier:1} },
];

/** 40 base alerts — displayed on first load (15 visible, rest via infinite scroll) */
const MOCK_ALERTS: Alert[] = [
  { id:'ALT-2024-0001', entity_id:'ENT-001', alert_type:'Threat', title:'Coordinated disinformation campaign detected across multiple platforms', description:'Entity @shadowprophet showing coordinated inauthentic behavior with 47 linked accounts amplifying extremist content.', risk_score:96, risk_level:'critical', status:'new', matched_pattern:'COORD_INAUTH_V3', risk_factors:['Bot network','Cross-platform coordination','Extremist content'], created_at:'2024-12-15T14:23:00Z', entity:{ id:'ENT-001', entity_type:'account', primary_identifier:'@shadowprophet', display_name:'Shadow Prophet', risk_score:96, risk_level:'critical', is_flagged:true, event_count:2847, last_seen:'2024-12-15T14:20:00Z' } },
  { id:'ALT-2024-0002', entity_id:'ENT-002', alert_type:'Terrorism', title:'Suspected recruitment messaging pattern identified', description:'Account @void_herald using coded language consistent with known recruitment scripts. 12 known contacts flagged.', risk_score:94, risk_level:'critical', status:'investigating', matched_pattern:'RECRUIT_PATTERN_7', risk_factors:['Coded language','Known network','Recruitment script'], created_at:'2024-12-15T13:10:00Z', entity:{ id:'ENT-002', entity_type:'account', primary_identifier:'@void_herald', display_name:'Void Herald', risk_score:94, risk_level:'critical', is_flagged:true, event_count:1203, last_seen:'2024-12-15T13:05:00Z' } },
  { id:'ALT-2024-0003', entity_id:'ENT-003', alert_type:'Fraud', title:'Financial fraud network — crypto wallet cluster identified', description:'Cluster of 8 wallets showing layering behavior with $2.3M in suspicious transactions over 72 hours.', risk_score:91, risk_level:'critical', status:'confirmed', matched_pattern:'CRYPTO_LAYER_V2', risk_factors:['Layering','High velocity','Dark market link'], created_at:'2024-12-15T11:45:00Z', entity:{ id:'ENT-003', entity_type:'wallet', primary_identifier:'0x4f8a...3c21', display_name:'Wallet Cluster Alpha', risk_score:91, risk_level:'critical', is_flagged:true, event_count:412, last_seen:'2024-12-15T11:40:00Z' } },
  { id:'ALT-2024-0004', entity_id:'ENT-004', alert_type:'Narrative', title:'Rapid narrative injection — election integrity attack vector', description:'Synthetic narrative seeding detected across 3 regional outlets simultaneously. Origin traced to @mirrorecho.', risk_score:88, risk_level:'critical', status:'new', matched_pattern:'NARRATIVE_INJ_V1', risk_factors:['Synthetic origin','Multi-outlet','Election content'], created_at:'2024-12-15T10:30:00Z', entity:{ id:'ENT-004', entity_type:'account', primary_identifier:'@mirrorecho', display_name:'Mirror Echo', risk_score:88, risk_level:'critical', is_flagged:true, event_count:934, last_seen:'2024-12-15T10:25:00Z' } },
  { id:'ALT-2024-0005', entity_id:'ENT-005', alert_type:'Threat', title:'High-velocity posting anomaly — possible automated threat actor', description:'Account posting 340 messages/hour, 4.7x baseline. Content includes coded references to infrastructure targets.', risk_score:87, risk_level:'critical', status:'under_review', matched_pattern:'VELOCITY_SPIKE_V4', risk_factors:['Automation','Infrastructure reference','High velocity'], created_at:'2024-12-15T09:15:00Z', entity:{ id:'ENT-005', entity_type:'account', primary_identifier:'@rapidfire_99', display_name:'Rapidfire 99', risk_score:87, risk_level:'critical', is_flagged:true, event_count:7823, last_seen:'2024-12-15T09:10:00Z' } },
  { id:'ALT-2024-0006', entity_id:'ENT-006', alert_type:'Entity', title:'Known sanctioned individual — alias confirmed via biometric link', description:'Entity confirmed as alias of OFAC-sanctioned individual Aleksei Dronov. Confidence 94%.', risk_score:85, risk_level:'critical', status:'confirmed', matched_pattern:'SANCTION_ALIAS_V1', risk_factors:['Sanctioned entity','Alias confirmed','OFAC list'], created_at:'2024-12-15T08:00:00Z', entity:{ id:'ENT-006', entity_type:'person', primary_identifier:'Nikolai_Vek', display_name:'Nikolai Vek', risk_score:85, risk_level:'critical', is_flagged:true, event_count:289, last_seen:'2024-12-15T07:55:00Z' } },
  { id:'ALT-2024-0007', entity_id:'ENT-007', alert_type:'Threat', title:'Cross-border influence operation — state-linked behavior', description:'Network of 23 accounts operating from IP blocks associated with foreign intelligence infrastructure.', risk_score:82, risk_level:'critical', status:'investigating', matched_pattern:'STATE_LINKED_V2', risk_factors:['State-linked IP','Coordinated','Foreign origin'], created_at:'2024-12-14T22:10:00Z', entity:{ id:'ENT-007', entity_type:'network', primary_identifier:'NET-CLUSTER-23', display_name:'Network Cluster 23', risk_score:82, risk_level:'critical', is_flagged:true, event_count:4512, last_seen:'2024-12-14T22:05:00Z' } },
  { id:'ALT-2024-0008', entity_id:'ENT-008', alert_type:'Fraud', title:'Impersonation of government official detected', description:'@gov_realminister matches 91% visual similarity to verified government account. 18K followers deceived.', risk_score:79, risk_level:'high', status:'new', matched_pattern:'IMPERSON_GOV_V3', risk_factors:['Impersonation','Government target','Large reach'], created_at:'2024-12-14T20:45:00Z', entity:{ id:'ENT-008', entity_type:'account', primary_identifier:'@gov_realminister', display_name:'Gov Real Minister', risk_score:79, risk_level:'high', is_flagged:true, event_count:643, last_seen:'2024-12-14T20:40:00Z' } },
  { id:'ALT-2024-0009', entity_id:'ENT-009', alert_type:'Narrative', title:'Health misinformation spike — vaccine safety narrative', description:'Coordinated push of debunked vaccine content reaching 2.1M impressions in 6 hours. 14 origin accounts identified.', risk_score:76, risk_level:'high', status:'under_review', matched_pattern:'HEALTH_MISINFO_V5', risk_factors:['Health misinformation','High reach','Coordinated amplification'], created_at:'2024-12-14T19:30:00Z', entity:{ id:'ENT-009', entity_type:'account', primary_identifier:'@truthmedical22', display_name:'Truth Medical 22', risk_score:76, risk_level:'high', is_flagged:true, event_count:1847, last_seen:'2024-12-14T19:25:00Z' } },
  { id:'ALT-2024-0010', entity_id:'ENT-010', alert_type:'Terrorism', title:'Glorification of proscribed organization — repeat offender', description:'Account @freedom_specter posting content glorifying proscribed group for 3rd time. Prior warnings unheeded.', risk_score:74, risk_level:'high', status:'new', matched_pattern:'PROSCRIBED_ORG_V2', risk_factors:['Proscribed content','Repeat offender','Glorification'], created_at:'2024-12-14T18:00:00Z', entity:{ id:'ENT-010', entity_type:'account', primary_identifier:'@freedom_specter', display_name:'Freedom Specter', risk_score:74, risk_level:'high', is_flagged:true, event_count:521, last_seen:'2024-12-14T17:55:00Z' } },
  { id:'ALT-2024-0011', entity_id:'ENT-011', alert_type:'Fraud', title:'Synthetic media — deepfake political content viral spread', description:'AI-generated video of political figure making false statements gaining traction. 450K views in 2 hours.', risk_score:72, risk_level:'high', status:'investigating', matched_pattern:'DEEPFAKE_POL_V1', risk_factors:['Deepfake','Political content','Viral spread'], created_at:'2024-12-14T17:15:00Z', entity:{ id:'ENT-011', entity_type:'content', primary_identifier:'CONTENT-VID-4421', display_name:'Viral Video 4421', risk_score:72, risk_level:'high', is_flagged:true, event_count:892, last_seen:'2024-12-14T17:10:00Z' } },
  { id:'ALT-2024-0012', entity_id:'ENT-012', alert_type:'Entity', title:'Shell company network linked to sanctions evasion', description:'ORG-Helios registered in 4 jurisdictions with overlapping directors and obfuscated beneficial ownership.', risk_score:71, risk_level:'high', status:'under_review', matched_pattern:'SHELL_NETWORK_V3', risk_factors:['Shell company','Sanctions evasion','Obfuscation'], created_at:'2024-12-14T15:45:00Z', entity:{ id:'ENT-012', entity_type:'organization', primary_identifier:'ORG-HELIOS-LLC', display_name:'Helios LLC', risk_score:71, risk_level:'high', is_flagged:true, event_count:134, last_seen:'2024-12-14T15:40:00Z' } },
  { id:'ALT-2024-0013', entity_id:'ENT-013', alert_type:'Threat', title:'Dark web credential dump — government email domain', description:'1,240 credentials from .gov.in domain posted on known dark web forum. Verified active accounts: 312.', risk_score:69, risk_level:'high', status:'new', matched_pattern:'CRED_DUMP_GOV_V2', risk_factors:['Credential dump','Government target','Active accounts'], created_at:'2024-12-14T14:30:00Z', entity:{ id:'ENT-013', entity_type:'domain', primary_identifier:'*.gov.in', display_name:'GOV.IN Domain', risk_score:69, risk_level:'high', is_flagged:true, event_count:1240, last_seen:'2024-12-14T14:25:00Z' } },
  { id:'ALT-2024-0014', entity_id:'ENT-014', alert_type:'Narrative', title:'Economic destabilization narrative — coordinated market panic content', description:'30 accounts simultaneously publishing false claims about banking sector collapse. Sentiment: -0.82.', risk_score:67, risk_level:'high', status:'confirmed', matched_pattern:'ECON_DESTAB_V1', risk_factors:['Economic narrative','Coordinated','Negative sentiment'], created_at:'2024-12-14T13:00:00Z', entity:{ id:'ENT-014', entity_type:'network', primary_identifier:'NET-ECON-30', display_name:'Economic Narrative Network', risk_score:67, risk_level:'high', is_flagged:true, event_count:2103, last_seen:'2024-12-14T12:55:00Z' } },
  { id:'ALT-2024-0015', entity_id:'ENT-015', alert_type:'Entity', title:'Flagged journalist network — potential hostile intelligence asset', description:'Network analysis shows @press_watch_hq receiving direction from known state-linked handlers.', risk_score:64, risk_level:'high', status:'investigating', matched_pattern:'INTEL_ASSET_V1', risk_factors:['State-linked handler','Media influence','Direction evidence'], created_at:'2024-12-14T11:30:00Z', entity:{ id:'ENT-015', entity_type:'account', primary_identifier:'@press_watch_hq', display_name:'Press Watch HQ', risk_score:64, risk_level:'high', is_flagged:true, event_count:876, last_seen:'2024-12-14T11:25:00Z' } },
  // Page 2 (loaded on scroll)
  { id:'ALT-2024-0016', entity_id:'ENT-016', alert_type:'Fraud', title:'Romance scam network targeting defense personnel', description:'Honeypot account cluster identified targeting military LinkedIn profiles. 22 victims identified.', risk_score:62, risk_level:'high', status:'new', matched_pattern:'ROMANCE_SCAM_V4', risk_factors:['Defense target','Social engineering','Honeypot'], created_at:'2024-12-14T10:00:00Z', entity:{ id:'ENT-016', entity_type:'account', primary_identifier:'@amara.belle_91', display_name:'Amara Belle', risk_score:62, risk_level:'high', is_flagged:true, event_count:347, last_seen:'2024-12-14T09:55:00Z' } },
  { id:'ALT-2024-0017', entity_id:'ENT-017', alert_type:'Threat', title:'Phishing kit deployment — critical infrastructure theme', description:'New phishing kit mimicking power grid portal deployed on 3 domains. Credential harvesting active.', risk_score:61, risk_level:'high', status:'under_review', matched_pattern:'PHISH_INFRA_V2', risk_factors:['Phishing','Infrastructure lure','Active harvest'], created_at:'2024-12-14T08:30:00Z', entity:{ id:'ENT-017', entity_type:'domain', primary_identifier:'grid-portal-secure.net', display_name:'Grid Portal Fake', risk_score:61, risk_level:'high', is_flagged:true, event_count:89, last_seen:'2024-12-14T08:25:00Z' } },
  { id:'ALT-2024-0018', entity_id:'ENT-018', alert_type:'Narrative', title:'Communal tension narrative spreading in regional language', description:'Content in Telugu promoting communal division reaching 800K accounts via WhatsApp forwards.', risk_score:59, risk_level:'high', status:'new', matched_pattern:'COMMUNAL_V3', risk_factors:['Communal content','Regional spread','High reach'], created_at:'2024-12-13T23:45:00Z', entity:{ id:'ENT-018', entity_type:'content', primary_identifier:'WA-CONTENT-8821', display_name:'WhatsApp Content 8821', risk_score:59, risk_level:'high', is_flagged:true, event_count:4200, last_seen:'2024-12-13T23:40:00Z' } },
  { id:'ALT-2024-0019', entity_id:'ENT-019', alert_type:'Entity', title:'Procurement anomaly — single vendor dominance pattern', description:'VENDOR-AXIOM won 94% of contracts in sector Q4. Multiple submissions share identical IP addresses.', risk_score:57, risk_level:'medium', status:'under_review', matched_pattern:'PROCURE_ANOM_V1', risk_factors:['Procurement fraud','IP overlap','Single vendor'], created_at:'2024-12-13T22:00:00Z', entity:{ id:'ENT-019', entity_type:'organization', primary_identifier:'VENDOR-AXIOM-PVT', display_name:'Axiom Private Ltd', risk_score:57, risk_level:'medium', is_flagged:false, event_count:67, last_seen:'2024-12-13T21:55:00Z' } },
  { id:'ALT-2024-0020', entity_id:'ENT-020', alert_type:'Threat', title:'Underground forum chatter — specific facility named', description:'Forum post references a named industrial facility with operational details. Credibility score: 0.68.', risk_score:55, risk_level:'medium', status:'new', matched_pattern:'FORUM_THREAT_V2', risk_factors:['Facility named','Dark web source','Specific detail'], created_at:'2024-12-13T20:30:00Z', entity:{ id:'ENT-020', entity_type:'account', primary_identifier:'DW-USER-4432', display_name:'Dark Web User 4432', risk_score:55, risk_level:'medium', is_flagged:false, event_count:29, last_seen:'2024-12-13T20:25:00Z' } },
  { id:'ALT-2024-0021', entity_id:'ENT-021', alert_type:'Fraud', title:'SIM swap fraud cluster — telecoms personnel implicated', description:'Pattern of SIM swaps linked to insider at Telco-7 branch. 43 victims, $780K total loss.', risk_score:54, risk_level:'medium', status:'confirmed', matched_pattern:'SIM_SWAP_V2', risk_factors:['Insider threat','Telecom','Financial loss'], created_at:'2024-12-13T19:00:00Z', entity:{ id:'ENT-021', entity_type:'person', primary_identifier:'INSIDER-TELCO-007', display_name:'Telco Insider 007', risk_score:54, risk_level:'medium', is_flagged:true, event_count:43, last_seen:'2024-12-13T18:55:00Z' } },
  { id:'ALT-2024-0022', entity_id:'ENT-022', alert_type:'Narrative', title:'Astroturfing campaign — fake grassroots environmental movement', description:'Hashtag #GreenRise traced to PR firm with petrochemical sector clients. 78% bot amplification.', risk_score:52, risk_level:'medium', status:'investigating', matched_pattern:'ASTROTURF_V3', risk_factors:['Astroturfing','Bot amplification','Corporate link'], created_at:'2024-12-13T17:30:00Z', entity:{ id:'ENT-022', entity_type:'campaign', primary_identifier:'#GreenRise', display_name:'GreenRise Campaign', risk_score:52, risk_level:'medium', is_flagged:false, event_count:12450, last_seen:'2024-12-13T17:25:00Z' } },
  { id:'ALT-2024-0023', entity_id:'ENT-023', alert_type:'Entity', title:'Suspected money mule account — recurring micro-transactions', description:'Account receiving 200-300 micro-transactions daily, aggregating to $12K before transfer to foreign IBAN.', risk_score:51, risk_level:'medium', status:'under_review', matched_pattern:'MONEY_MULE_V4', risk_factors:['Money mule','Aggregation','Foreign transfer'], created_at:'2024-12-13T16:00:00Z', entity:{ id:'ENT-023', entity_type:'account', primary_identifier:'BANK-ACC-1928374', display_name:'Bank Account 192837', risk_score:51, risk_level:'medium', is_flagged:false, event_count:8934, last_seen:'2024-12-13T15:55:00Z' } },
  { id:'ALT-2024-0024', entity_id:'ENT-024', alert_type:'Threat', title:'Insider data exfiltration — cloud storage anomaly', description:'Employee account accessing and uploading classified documents to personal cloud at 2-4 AM for 5 consecutive days.', risk_score:49, risk_level:'medium', status:'new', matched_pattern:'EXFIL_INSIDER_V1', risk_factors:['Insider threat','Off-hours access','Cloud upload'], created_at:'2024-12-13T14:30:00Z', entity:{ id:'ENT-024', entity_type:'person', primary_identifier:'EMP-ID-8847', display_name:'Employee 8847', risk_score:49, risk_level:'medium', is_flagged:false, event_count:157, last_seen:'2024-12-13T14:25:00Z' } },
  { id:'ALT-2024-0025', entity_id:'ENT-025', alert_type:'Fraud', title:'Charity fraud — disaster relief impersonation', description:'Fake relief fund collecting donations. QR code linked to personal account. 2,300 donors affected.', risk_score:48, risk_level:'medium', status:'new', matched_pattern:'CHARITY_FRAUD_V2', risk_factors:['Charity fraud','QR code','Donor victims'], created_at:'2024-12-13T13:00:00Z', entity:{ id:'ENT-025', entity_type:'account', primary_identifier:'@reliefnow_2024', display_name:'Relief Now 2024', risk_score:48, risk_level:'medium', is_flagged:false, event_count:2300, last_seen:'2024-12-13T12:55:00Z' } },
  { id:'ALT-2024-0026', entity_id:'ENT-026', alert_type:'Narrative', title:'Emerging anti-institution sentiment cluster', description:'Cluster of 340 accounts showing synchronized negative sentiment toward judicial institutions. New formation.', risk_score:46, risk_level:'medium', status:'under_review', matched_pattern:'ANTI_INST_V2', risk_factors:['Anti-institution','Synchronized sentiment','New cluster'], created_at:'2024-12-13T11:30:00Z', entity:{ id:'ENT-026', entity_type:'network', primary_identifier:'NET-ANTIJ-340', display_name:'Anti-Justice Network', risk_score:46, risk_level:'medium', is_flagged:false, event_count:5621, last_seen:'2024-12-13T11:25:00Z' } },
  { id:'ALT-2024-0027', entity_id:'ENT-027', alert_type:'Entity', title:'Unregistered foreign agent — lobbying on behalf of state actor', description:'Individual PERSON-CRANE identified lobbying lawmakers without mandatory registration. 14 meetings documented.', risk_score:44, risk_level:'medium', status:'investigating', matched_pattern:'FOREIGN_AGENT_V1', risk_factors:['Foreign agent','Unregistered','Lobbying'], created_at:'2024-12-13T10:00:00Z', entity:{ id:'ENT-027', entity_type:'person', primary_identifier:'PERSON-CRANE-ID', display_name:'Agent Crane', risk_score:44, risk_level:'medium', is_flagged:false, event_count:78, last_seen:'2024-12-13T09:55:00Z' } },
  { id:'ALT-2024-0028', entity_id:'ENT-028', alert_type:'Threat', title:'Suspicious travel pattern — border zone proximity', description:'Individual crossing into sensitive border zone 12 times in 30 days. No declared purpose. Pattern matches surveillance profile.', risk_score:42, risk_level:'medium', status:'new', matched_pattern:'TRAVEL_ANOM_V3', risk_factors:['Border proximity','Repeat crossing','No declared purpose'], created_at:'2024-12-12T22:00:00Z', entity:{ id:'ENT-028', entity_type:'person', primary_identifier:'PERSON-ID-99213', display_name:'Traveler 99213', risk_score:42, risk_level:'medium', is_flagged:false, event_count:12, last_seen:'2024-12-12T21:55:00Z' } },
  { id:'ALT-2024-0029', entity_id:'ENT-029', alert_type:'Fraud', title:'Identity document forgery network — regional hub', description:'Telegram group FORGE-HUB offering forged documents. 87 members, 230 transactions documented.', risk_score:40, risk_level:'medium', status:'under_review', matched_pattern:'DOCUMENT_FORGE_V2', risk_factors:['Document forgery','Telegram group','Organized crime'], created_at:'2024-12-12T20:30:00Z', entity:{ id:'ENT-029', entity_type:'group', primary_identifier:'TG-GROUP-FORGEHUB', display_name:'Forge Hub Telegram', risk_score:40, risk_level:'medium', is_flagged:false, event_count:230, last_seen:'2024-12-12T20:25:00Z' } },
  { id:'ALT-2024-0030', entity_id:'ENT-030', alert_type:'Narrative', title:'Low-grade rumor seeding — military readiness false claims', description:'6 accounts posting unverified claims about military unit readiness. Credibility: low. Reach: 45K.', risk_score:38, risk_level:'medium', status:'new', matched_pattern:'RUMOR_MIL_V1', risk_factors:['Military narrative','Unverified claims','Low credibility'], created_at:'2024-12-12T19:00:00Z', entity:{ id:'ENT-030', entity_type:'account', primary_identifier:'@mil_observer_x', display_name:'Mil Observer X', risk_score:38, risk_level:'medium', is_flagged:false, event_count:324, last_seen:'2024-12-12T18:55:00Z' } },
  { id:'ALT-2024-0031', entity_id:'ENT-031', alert_type:'Entity', title:'NFT marketplace wash trading — artificial volume inflation', description:'Wallet cluster inflating NFT values through self-trading. 340 wash trades identified, $1.2M artificial volume.', risk_score:36, risk_level:'medium', status:'dismissed', matched_pattern:'WASH_TRADE_V2', risk_factors:['Wash trading','NFT','Volume inflation'], created_at:'2024-12-12T17:30:00Z', entity:{ id:'ENT-031', entity_type:'wallet', primary_identifier:'0xab12...8f44', display_name:'NFT Wash Cluster', risk_score:36, risk_level:'medium', is_flagged:false, event_count:340, last_seen:'2024-12-12T17:25:00Z' } },
  { id:'ALT-2024-0032', entity_id:'ENT-032', alert_type:'Threat', title:'Suspicious communication pattern — encrypted channel pivot', description:'Target entity switching communication platforms 3x in 48 hours. Counter-surveillance behavior detected.', risk_score:34, risk_level:'low', status:'resolved', matched_pattern:'COMM_PIVOT_V1', risk_factors:['Counter-surveillance','Platform switch','Evasion behavior'], created_at:'2024-12-12T16:00:00Z', entity:{ id:'ENT-032', entity_type:'account', primary_identifier:'@signal_ghost_88', display_name:'Signal Ghost 88', risk_score:34, risk_level:'low', is_flagged:false, event_count:56, last_seen:'2024-12-12T15:55:00Z' } },
  { id:'ALT-2024-0033', entity_id:'ENT-033', alert_type:'Fraud', title:'Insurance claim fraud — organized ring detected', description:'7 claimants filing identical injury claims at different hospitals. Same legal representative, same injury description.', risk_score:32, risk_level:'low', status:'confirmed', matched_pattern:'INSURANCE_RING_V3', risk_factors:['Organized fraud','Identical claims','Legal network'], created_at:'2024-12-12T14:30:00Z', entity:{ id:'ENT-033', entity_type:'network', primary_identifier:'CLAIM-RING-07', display_name:'Claim Ring 07', risk_score:32, risk_level:'low', is_flagged:false, event_count:21, last_seen:'2024-12-12T14:25:00Z' } },
  { id:'ALT-2024-0034', entity_id:'ENT-034', alert_type:'Narrative', title:'Minor sentiment anomaly — spike in negative brand mentions', description:'Brand XYZ-Corp receiving 340% above average negative sentiment. Possible coordinated competitor action.', risk_score:28, risk_level:'low', status:'dismissed', matched_pattern:'BRAND_ATTACK_V1', risk_factors:['Brand attack','Sentiment spike','Competitor link'], created_at:'2024-12-12T13:00:00Z', entity:{ id:'ENT-034', entity_type:'campaign', primary_identifier:'#XYZCorpFail', display_name:'XYZ Corp Fail Campaign', risk_score:28, risk_level:'low', is_flagged:false, event_count:12080, last_seen:'2024-12-12T12:55:00Z' } },
  { id:'ALT-2024-0035', entity_id:'ENT-035', alert_type:'Entity', title:'Dormant account reactivation — possible account takeover', description:'Account dormant for 847 days suddenly active with new device fingerprint and changed bio.', risk_score:26, risk_level:'low', status:'new', matched_pattern:'ACCOUNT_TAKEOVER_V2', risk_factors:['Account takeover','Dormant reactivation','New device'], created_at:'2024-12-12T11:30:00Z', entity:{ id:'ENT-035', entity_type:'account', primary_identifier:'@old_account_332', display_name:'Old Account 332', risk_score:26, risk_level:'low', is_flagged:false, event_count:3, last_seen:'2024-12-12T11:25:00Z' } },
  { id:'ALT-2024-0036', entity_id:'ENT-036', alert_type:'Threat', title:'Low-priority VPN anomaly — restricted jurisdiction access', description:'User account accessed from VPN exit node in restricted jurisdiction. Single occurrence. Low risk.', risk_score:18, risk_level:'low', status:'resolved', matched_pattern:'VPN_RESTRICT_V1', risk_factors:['VPN usage','Restricted jurisdiction','Single occurrence'], created_at:'2024-12-12T10:00:00Z', entity:{ id:'ENT-036', entity_type:'account', primary_identifier:'USER-34219', display_name:'User 34219', risk_score:18, risk_level:'low', is_flagged:false, event_count:1, last_seen:'2024-12-12T09:55:00Z' } },
  { id:'ALT-2024-0037', entity_id:'ENT-037', alert_type:'Fraud', title:'Payment gateway test transactions — card validation probe', description:'Sequence of $0.01 test charges across 12 merchants indicating stolen card validation attempt.', risk_score:15, risk_level:'low', status:'dismissed', matched_pattern:'CARD_TEST_V3', risk_factors:['Card testing','Multi-merchant','Small transactions'], created_at:'2024-12-12T09:00:00Z', entity:{ id:'ENT-037', entity_type:'account', primary_identifier:'CARD-CLUSTER-4421', display_name:'Card Cluster 4421', risk_score:15, risk_level:'low', is_flagged:false, event_count:48, last_seen:'2024-12-12T08:55:00Z' } },
  { id:'ALT-2024-0038', entity_id:'ENT-038', alert_type:'Narrative', title:'General misinformation — unverified celebrity rumor', description:'Viral rumor about celebrity activity gaining traction. Content unverified. No clear malicious actor.', risk_score:12, risk_level:'info', status:'resolved', matched_pattern:'RUMOR_CELEB_V1', risk_factors:['Unverified content','Viral spread'], created_at:'2024-12-12T08:00:00Z', entity:{ id:'ENT-038', entity_type:'content', primary_identifier:'CONTENT-RUMOR-221', display_name:'Rumor Content 221', risk_score:12, risk_level:'info', is_flagged:false, event_count:45200, last_seen:'2024-12-12T07:55:00Z' } },
  { id:'ALT-2024-0039', entity_id:'ENT-039', alert_type:'Entity', title:'New entity onboarded — elevated watch status', description:'Newly registered entity ORG-NOVA meets 3 of 8 watchlist criteria. Elevated monitoring initiated.', risk_score:9, risk_level:'info', status:'new', matched_pattern:'NEW_ENTITY_V1', risk_factors:['New registration','Watchlist criteria'], created_at:'2024-12-12T07:00:00Z', entity:{ id:'ENT-039', entity_type:'organization', primary_identifier:'ORG-NOVA-2024', display_name:'Nova Org 2024', risk_score:9, risk_level:'info', is_flagged:false, event_count:4, last_seen:'2024-12-12T06:55:00Z' } },
  { id:'ALT-2024-0040', entity_id:'ENT-040', alert_type:'Threat', title:'Scheduled system scan — automated baseline check', description:'Routine automated threat baseline completed. No anomalies detected in monitored channels.', risk_score:5, risk_level:'info', status:'resolved', matched_pattern:'BASELINE_SCAN_V1', risk_factors:['Routine scan'], created_at:'2024-12-12T06:00:00Z', entity:{ id:'ENT-040', entity_type:'system', primary_identifier:'SYS-SCAN-AUTO', display_name:'Auto Scan System', risk_score:5, risk_level:'info', is_flagged:false, event_count:1, last_seen:'2024-12-12T05:55:00Z' } },
];

/** 5 alerts injected every 15-min refresh — all brand-new "LIVE:" events */
const NEW_ALERTS_BATCH_TEMPLATE: Omit<Alert,'id'|'created_at'>[] = [
  { entity_id:'ENT-101', alert_type:'Threat', title:'LIVE: Zero-day exploit chatter on dark web forums', description:'Multiple dark web sources discussing active zero-day affecting critical government infrastructure. Proof-of-concept shared.', risk_score:98, risk_level:'critical', status:'new', matched_pattern:'ZERODAY_V1', risk_factors:['Zero-day','Government target','PoC shared'], entity:{ id:'ENT-101', entity_type:'domain', primary_identifier:'DW-FORUM-ELITE', display_name:'Elite Forum', risk_score:98, risk_level:'critical', is_flagged:true, event_count:1, last_seen:'' } },
  { entity_id:'ENT-102', alert_type:'Terrorism', title:'LIVE: Imminent threat signal — coded activation message detected', description:'Coded message matching known activation pattern broadcast across 3 encrypted channels simultaneously.', risk_score:97, risk_level:'critical', status:'new', matched_pattern:'ACTIVATION_CODE_V2', risk_factors:['Activation message','Encrypted channels','Simultaneous broadcast'], entity:{ id:'ENT-102', entity_type:'network', primary_identifier:'CHAN-CLUSTER-X7', display_name:'Channel Cluster X7', risk_score:97, risk_level:'critical', is_flagged:true, event_count:3, last_seen:'' } },
  { entity_id:'ENT-103', alert_type:'Fraud', title:'LIVE: Large-scale bank transfer anomaly — $4.7M movement', description:'Unauthorized transfer chain detected. Funds moving through 7 jurisdictions in real time.', risk_score:95, risk_level:'critical', status:'new', matched_pattern:'LARGE_TRANSFER_V1', risk_factors:['Unauthorized transfer','Multi-jurisdiction','Real-time movement'], entity:{ id:'ENT-103', entity_type:'wallet', primary_identifier:'TRANSFER-CHAIN-X', display_name:'Transfer Chain X', risk_score:95, risk_level:'critical', is_flagged:true, event_count:7, last_seen:'' } },
  { entity_id:'ENT-104', alert_type:'Narrative', title:'LIVE: Coordinated attack on election infrastructure narrative', description:'Synchronized false reports of voting machine failures spreading across 12 states simultaneously.', risk_score:93, risk_level:'critical', status:'new', matched_pattern:'ELECTION_ATTACK_V1', risk_factors:['Election narrative','Synchronized','Multi-state'], entity:{ id:'ENT-104', entity_type:'campaign', primary_identifier:'#VoterFraud2024', display_name:'Voter Fraud Campaign', risk_score:93, risk_level:'critical', is_flagged:true, event_count:28400, last_seen:'' } },
  { entity_id:'ENT-105', alert_type:'Threat', title:'LIVE: Physical surveillance team detected near diplomatic facility', description:'OSINT confirms 3-person surveillance team photographing staff exits at Consulate-7 for 4 consecutive days.', risk_score:90, risk_level:'critical', status:'new', matched_pattern:'PHYSICAL_SURV_V1', risk_factors:['Physical surveillance','Diplomatic target','Repeat pattern'], entity:{ id:'ENT-105', entity_type:'person', primary_identifier:'SURV-TEAM-3', display_name:'Surveillance Team 3', risk_score:90, risk_level:'critical', is_flagged:true, event_count:4, last_seen:'' } },
];

/** Running counter so each refresh cycle generates unique IDs */
let _batchCounter = 0;
function generateNewBatch(): Alert[] {
  const now = new Date().toISOString();
  _batchCounter++;
  return NEW_ALERTS_BATCH_TEMPLATE.map((tmpl, i) => ({
    ...tmpl,
    id: `ALT-LIVE-${_batchCounter}-${i + 1}`,
    created_at: now,
    entity: tmpl.entity ? { ...tmpl.entity, last_seen: now } : undefined,
  }));
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITY
═══════════════════════════════════════════════════════════════════════════ */
function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000)    return `${Math.floor(d / 1000)}s ago`;
  if (d < 3600000)  return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}
function scoreColor(s: number): string {
  if (s >= 85) return C.supportError;
  if (s >= 65) return C.supportWarning;
  if (s >= 45) return C.supportInfo;
  return C.supportSuccess;
}
function clamp(v: number, mn: number, mx: number) { return Math.min(mx, Math.max(mn, v)); }
function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK DATA HELPERS
═══════════════════════════════════════════════════════════════════════════ */
function applyMockFilters(items: Alert[], filters: Filters, query: string): Alert[] {
  let out = [...items];
  if (filters.risk_level !== 'all') out = out.filter(a => a.risk_level === filters.risk_level);
  if (filters.type !== 'All types') out = out.filter(a => a.alert_type === filters.type);
  if (filters.status !== 'all')     out = out.filter(a => a.status === filters.status);
  if (query) {
    const q = query.toLowerCase();
    out = out.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      a.alert_type.toLowerCase().includes(q) ||
      (a.entity?.primary_identifier || '').toLowerCase().includes(q)
    );
  }
  const [sortBy, sortDir] = filters.sort.split('|');
  out.sort((a, b) => {
    const av = sortBy === 'risk_score' ? a.risk_score : new Date(a.created_at).getTime();
    const bv = sortBy === 'risk_score' ? b.risk_score : new Date(b.created_at).getTime();
    return sortDir === 'asc' ? av - bv : bv - av;
  });
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTS — Carbon atoms
═══════════════════════════════════════════════════════════════════════════ */
function CTag({ pair, small, mono, children, onRemove }: { pair:{bg:string;text:string}; small?:boolean; mono?:boolean; children:ReactNode; onRemove?:()=>void }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:pair.bg, color:pair.text, padding:small?'0 6px':'0 8px', height:small?18:24, borderRadius:0, ...(mono?T.code01:T.label01), fontWeight:400, whiteSpace:'nowrap', flexShrink:0 }}>
      {children}
      {onRemove && <button onClick={onRemove} style={{ background:'none', border:'none', cursor:'pointer', color:pair.text, padding:0, lineHeight:1, fontSize:13, display:'flex', alignItems:'center' }}>×</button>}
    </span>
  );
}

function CBtn({ kind='primary', size='md', onClick, disabled, style:ext, icon, children }: { kind?:'primary'|'secondary'|'ghost'|'danger'|'tertiary'; size?:'sm'|'md'|'lg'; onClick?:(e:React.MouseEvent)=>void; disabled?:boolean; style?:CSSProperties; icon?:ReactNode; children?:ReactNode }) {
  const [hov, setHov] = useState(false);
  const s = { primary:{bg:'#0f62fe',bgH:'#0353e9',color:C.textOnColor,border:'none'}, secondary:{bg:C.layer02,bgH:'#4c4c4c',color:C.textPrimary,border:'none'}, ghost:{bg:'transparent',bgH:C.layerHover01,color:C.linkPrimary,border:'none'}, danger:{bg:C.supportError,bgH:'#ba1b23',color:C.textOnColor,border:'none'}, tertiary:{bg:'transparent',bgH:'rgba(255,255,255,0.06)',color:C.textPrimary,border:`1px solid ${C.borderStrong01}`} }[kind];
  const h = {sm:32,md:40,lg:48}[size];
  return (
    <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ height:h, padding:'0 15px', background:hov?s.bgH:s.bg, color:s.color, border:s.border, borderRadius:0, cursor:disabled?'not-allowed':'pointer', opacity:disabled?0.5:1, ...T.body01, display:'inline-flex', alignItems:'center', gap:8, transition:'background 70ms', whiteSpace:'nowrap', ...ext }}>
      {icon}<span>{children}</span>
    </button>
  );
}

function CInput({ value, onChange, placeholder, width=256, icon, label }: { value:string; onChange:(v:string)=>void; placeholder?:string; width?:number|string; icon?:ReactNode; label?:string }) {
  const [foc, setFoc] = useState(false);
  return (
    <div style={{ width }}>
      {label && <div style={{ ...T.label01, color:C.textSecondary, marginBottom:4 }}>{label}</div>}
      <div style={{ position:'relative' }}>
        {icon && <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.iconSecondary, pointerEvents:'none' }}>{icon}</span>}
        <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}
          style={{ width:'100%', height:40, background:C.layer01, border:'none', borderBottom:`2px solid ${foc?C.focus:C.borderStrong01}`, color:C.textPrimary, padding:icon?'0 40px 0 40px':'0 12px', outline:'none', boxSizing:'border-box', ...T.body01, borderRadius:0 }} />
      </div>
    </div>
  );
}

function CSelect({ value, onChange, options, width=160, label }: { value:string; onChange:(v:string)=>void; options:Array<{value:string;label:string}|string>; width?:number|string; label?:string }) {
  const opts = options.map(o=>typeof o==='string'?{value:o,label:o}:o);
  return (
    <div style={{ width }}>
      {label && <div style={{ ...T.label01, color:C.textSecondary, marginBottom:4 }}>{label}</div>}
      <div style={{ position:'relative' }}>
        <select value={value} onChange={e=>onChange(e.target.value)}
          style={{ width:'100%', height:40, background:C.layer01, border:'none', borderBottom:`2px solid ${C.borderStrong01}`, color:C.textPrimary, padding:'0 32px 0 12px', appearance:'none', outline:'none', ...T.body01, borderRadius:0, cursor:'pointer' }}>
          {opts.map(o=><option key={o.value} value={o.value} style={{ background:C.layer02 }}>{o.label}</option>)}
        </select>
        <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:C.iconSecondary, pointerEvents:'none', fontSize:10 }}>▾</span>
      </div>
    </div>
  );
}

function CSpinner({ size=24 }: { size?:number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ animation:'ila-spin 0.7s linear infinite' }}>
      <circle cx="50" cy="50" r="44" fill="none" stroke={C.borderSubtle01} strokeWidth="10"/>
      <circle cx="50" cy="50" r="44" fill="none" stroke={C.interactive} strokeWidth="10" strokeDasharray="138 138" strokeDashoffset="103" strokeLinecap="butt" transform="rotate(-90 50 50)"/>
    </svg>
  );
}

function CNotif({ kind='error', title, subtitle, onClose }: { kind?:'error'|'warning'|'success'|'info'; title:string; subtitle?:string; onClose?:()=>void }) {
  const K = { error:{bg:C.supportErrorBg,bar:C.supportError,icon:'⊗'}, warning:{bg:C.supportWarningBg,bar:C.supportWarning,icon:'⚠'}, success:{bg:C.supportSuccessBg,bar:C.supportSuccess,icon:'✓'}, info:{bg:C.supportInfoBg,bar:C.supportInfo,icon:'ℹ'} }[kind];
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, background:K.bg, borderLeft:`3px solid ${K.bar}`, padding:'10px 16px', ...T.body01, position:'relative' }}>
      <span style={{ color:K.bar, fontSize:16, flexShrink:0, marginTop:1 }}>{K.icon}</span>
      <div><span style={{ color:C.textPrimary, fontWeight:600 }}>{title}</span>{subtitle && <span style={{ color:C.textSecondary, marginLeft:6 }}>{subtitle}</span>}</div>
      {onClose && <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.iconSecondary, position:'absolute', right:12, top:10, fontSize:16, padding:0 }}>×</button>}
    </div>
  );
}

function CProgressBar({ value, max=10, color }: { value:number; max?:number; color:string }) {
  return (
    <div style={{ height:4, background:C.layer02, width:'100%' }}>
      <div style={{ height:'100%', width:`${clamp((value/max)*100,0,100)}%`, background:color, transition:'width 0.4s ease' }} />
    </div>
  );
}

function CCheckbox({ checked, onToggle, label }: { checked:boolean; onToggle:()=>void; label:string }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'5px 0' }}>
      <div onClick={onToggle} style={{ width:16, height:16, flexShrink:0, borderRadius:0, border:`2px solid ${checked?C.interactive:C.borderStrong01}`, background:checked?C.interactive:'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 70ms, border-color 70ms' }}>
        {checked && <span style={{ color:'#fff', fontSize:10, fontWeight:700 }}>✓</span>}
      </div>
      <span style={{ ...T.body01, color:C.textPrimary }} onClick={onToggle}>{label}</span>
    </label>
  );
}

const Divider = ({ style:ext }: { style?:CSSProperties }) => <div style={{ height:1, background:C.borderSubtle00, ...ext }} />;
const SLabel  = ({ children }: { children:ReactNode }) => <div style={{ ...T.label01, color:C.textHelper, letterSpacing:'0.32px', textTransform:'uppercase', padding:'10px 16px 6px', fontWeight:600 }}>{children}</div>;
const SRow    = ({ label, value, mono, accent }: { label:string; value:string|ReactNode; mono?:boolean; accent?:string }) => (
  <div style={{ display:'grid', gridTemplateColumns:'110px 1fr', padding:'8px 16px', borderBottom:`1px solid ${C.borderSubtle00}`, alignItems:'start' }}>
    <span style={{ ...T.label01, color:C.textHelper }}>{label}</span>
    <span style={{ ...(mono?T.code01:T.body01), color:accent||C.textPrimary, wordBreak:'break-all' }}>{value}</span>
  </div>
);

/* ── Icons ── */
const IcoSearch       = () => <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M29 27.586l-7.552-7.552a11 11 0 10-1.414 1.414L27.586 29zM4 13a9 9 0 119 9 9.01 9.01 0 01-9-9z"/></svg>;
const IcoFilter       = () => <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M18 28H14a2 2 0 01-2-2v-7.59L4.59 11A2 2 0 014 9.59V6a2 2 0 012-2h20a2 2 0 012 2v3.59a2 2 0 01-.59 1.41L20 18.41V26a2 2 0 01-2 2zM6 6v3.59l8 8V26h4v-8.41l8-8V6z"/></svg>;
const IcoClose        = () => <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4l6.6 6.6L8 22.6 9.4 24l6.6-6.6 6.6 6.6 1.4-1.4-6.6-6.6L24 9.4z"/></svg>;
const IcoRefresh      = () => <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M27.65 15.57A12 12 0 0017 4.07V2l-5 4 5 4V7.93A9 9 0 1126 17h2a11 11 0 00-.35-1.43z"/></svg>;
const IcoWarning      = () => <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M16 2a14 14 0 1014 14A14 14 0 0016 2zm0 22a1.5 1.5 0 111.5-1.5A1.5 1.5 0 0116 24zm1-5h-2V9h2z"/></svg>;
const IcoGraph        = () => <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M28 2H4a2 2 0 00-2 2v24a2 2 0 002 2h24a2 2 0 002-2V4a2 2 0 00-2-2zm0 26H4V4h24zM8 24v-8h3v8zm6 0V10h3v14zm6 0v-5h3v5z"/></svg>;
const IcoExport       = () => <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M26 24v4H6v-4H4v4a2 2 0 002 2h20a2 2 0 002-2v-4zm0-10l-1.41-1.41L17 20.17V2h-2v18.17l-7.59-7.58L6 14l10 10 10-10z"/></svg>;
const IcoChevronRight = () => <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M22 16L12 26l-1.4-1.4 8.6-8.6-8.6-8.6L12 6z"/></svg>;
const IcoInformation  = () => <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M17 22v-9h-4v2h2v7h-3v2h8v-2zm-1-13a1.5 1.5 0 101.5 1.5A1.5 1.5 0 0016 9zm0-7A14 14 0 112 16 14 14 0 0116 2zm0 2a12 12 0 100 24A12 12 0 0016 4z"/></svg>;

/* ═══════════════════════════════════════════════════════════════════════════
   AUTO-REFRESH BANNER
   ─────────────────────────────────────────────────────────────────────────
   Blue strip between toolbar and table — countdown + "Refresh now" button.
   Progress bar underline fills left→right as time elapses.
═══════════════════════════════════════════════════════════════════════════ */
function RefreshBanner({ newCount, countdown, onRefreshNow, onDismiss }: {
  newCount: number; countdown: number; onRefreshNow: ()=>void; onDismiss: ()=>void;
}) {
  const elapsed = REFRESH_INTERVAL_MS - countdown;
  const pct     = clamp((elapsed / REFRESH_INTERVAL_MS) * 100, 0, 100);
  return (
    <div style={{ background:'#001d6c', borderBottom:`1px solid ${C.supportInfo}`, display:'flex', alignItems:'center', gap:12, padding:'0 16px', height:48, flexShrink:0, position:'relative', overflow:'hidden' }}>
      {/* progress fill */}
      <div style={{ position:'absolute', bottom:0, left:0, height:2, width:`${pct}%`, background:C.supportInfo, transition:'width 1s linear' }} />
      <span style={{ width:8, height:8, borderRadius:'50%', background:C.supportInfo, display:'inline-block', animation:'ila-blink 1s infinite', flexShrink:0 }} />
      <span style={{ ...T.body01, color:C.textPrimary }}>
        <strong style={{ color:C.linkPrimary }}>{newCount} new alert{newCount!==1?'s':''}</strong>
        {' '}available — auto-refresh in{' '}
        <strong style={{ color:C.textOnColor, ...T.code01 }}>{formatCountdown(countdown)}</strong>
      </span>
      <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
        <CBtn kind="primary" size="sm" onClick={onRefreshNow}>Refresh now</CBtn>
        <CBtn kind="ghost"   size="sm" onClick={onDismiss}>Dismiss</CBtn>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   KPI CARD  +  SPARKLINE
═══════════════════════════════════════════════════════════════════════════ */
function KpiCard({ label, value, color, border }: { label:string; value:string|number; color?:string; border?:string }) {
  return (
    <div style={{ flex:1, minWidth:120, padding:'12px 20px', background:C.layer01, borderLeft:`1px solid ${C.borderSubtle00}`, borderBottom:border?`3px solid ${border}`:'3px solid transparent' }}>
      <div style={{ ...T.heading03, color:color||C.textPrimary, lineHeight:1, marginBottom:4 }}>{typeof value==='number'?value.toLocaleString():value}</div>
      <div style={{ ...T.label01, color:C.textHelper }}>{label}</div>
    </div>
  );
}
function Sparkline({ data }: { data:Array<{hour:string;count:number}> }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d=>d.count),1); const W=200; const H=32;
  const pts = data.map((d,i)=>`${(i/(data.length-1))*W},${H-(d.count/max)*H}`).join(' ');
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <svg width={W} height={H} style={{ overflow:'visible' }}>
        <polyline points={pts} fill="none" stroke={C.supportInfo} strokeWidth="1.5"/>
        {data.map((d,i)=>d.count>0&&<circle key={i} cx={(i/(data.length-1))*W} cy={H-(d.count/max)*H} r="2" fill={C.supportInfo}/>)}
      </svg>
      <span style={{ ...T.label01, color:C.textHelper }}>24h</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FILTER FLYOUT
═══════════════════════════════════════════════════════════════════════════ */
function FilterPanel({ filters, onFilterChange, onClear, resultCount, dateRange, onDateRangeChange }: {
  filters:Filters; onFilterChange:(p:Partial<Filters>)=>void; onClear:()=>void;
  resultCount:number; dateRange:{start?:string;end?:string}; onDateRangeChange:(r:{start?:string;end?:string})=>void;
}) {
  const [open, setOpen] = useState(false);
  const ac = [filters.risk_level!=='all', filters.type!=='All types', filters.status!=='all', dateRange.start||dateRange.end].filter(Boolean).length;
  return (
    <>
      <CBtn kind={ac>0?'primary':'tertiary'} size="md" icon={<IcoFilter/>} onClick={()=>setOpen(o=>!o)}>
        Filters
        {ac>0&&<span style={{ background:'#fff', color:'#0f62fe', borderRadius:'50%', width:18, height:18, display:'inline-flex', alignItems:'center', justifyContent:'center', ...T.label01, fontWeight:600 }}>{ac}</span>}
      </CBtn>
      {open&&<div onClick={()=>setOpen(false)} style={{ position:'fixed', inset:0, zIndex:200, background:C.overlayBg }}/>}
      <div style={{ position:'fixed', top:0, right:0, width:320, height:'100vh', background:C.layer01, borderLeft:`1px solid ${C.borderSubtle01}`, zIndex:300, display:'flex', flexDirection:'column', transform:open?'translateX(0)':'translateX(100%)', transition:'transform 240ms cubic-bezier(0.4,0,0.2,1)', boxSizing:'border-box' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px', borderBottom:`1px solid ${C.borderSubtle00}` }}>
          <div><div style={{ ...T.heading02, color:C.textPrimary }}>Filters</div><div style={{ ...T.label01, color:C.textHelper, marginTop:3 }}>{resultCount} results match</div></div>
          <button onClick={()=>setOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:C.iconSecondary, padding:4 }}><IcoClose/></button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
          <SLabel>Risk level</SLabel>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap', padding:'0 0 12px' }}>
            {RISK_LEVELS.map(rl=>{ const cfg=rl==='all'?{tag:C.tagCoolGray,label:'All'}:SEV_CFG[rl]; const active=filters.risk_level===rl; return (
              <button key={rl} onClick={()=>onFilterChange({risk_level:rl})} style={{ height:30, padding:'0 11px', background:active?cfg.tag.bg:C.layer02, color:active?cfg.tag.text:C.textSecondary, border:active?`1px solid ${cfg.tag.text}40`:'1px solid transparent', borderRadius:0, ...T.label01, cursor:'pointer', transition:'background 70ms', textTransform:'capitalize' }}>{cfg.label||rl}</button>
            );})}
          </div>
          <Divider/>
          <SLabel>Alert type</SLabel>
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, padding:'0 0 12px' }}>
            {ALERT_TYPES.map(t=><button key={t} onClick={()=>onFilterChange({type:t})} style={{ height:30, padding:'0 11px', background:filters.type===t?C.interactive:C.layer02, color:filters.type===t?C.textOnColor:C.textSecondary, border:'none', borderRadius:0, ...T.label01, cursor:'pointer', transition:'background 70ms' }}>{t}</button>)}
          </div>
          <Divider/>
          <SLabel>Status</SLabel>
          {['all',...Object.keys(STAT_CFG)].map(s=><CCheckbox key={s} checked={filters.status===s} onToggle={()=>onFilterChange({status:s})} label={s==='all'?'All statuses':STAT_CFG[s]?.label||s}/>)}
          <Divider/>
          <SLabel>Date range</SLabel>
          <div style={{ display:'flex', gap:8, padding:'0 0 12px' }}>
            {(['start','end'] as const).map(k=>(
              <div key={k} style={{ flex:1 }}>
                <div style={{ ...T.label01, color:C.textHelper, marginBottom:4 }}>{k==='start'?'From':'To'}</div>
                <input type="date" value={dateRange[k]||''} onChange={e=>onDateRangeChange({...dateRange,[k]:e.target.value})} style={{ width:'100%', height:40, background:C.layer02, border:`1px solid ${C.borderSubtle01}`, borderRadius:0, color:C.textPrimary, padding:'0 12px', ...T.body01, outline:'none' }}/>
              </div>
            ))}
          </div>
          {ac>0&&<>
            <Divider style={{ margin:'16px 0' }}/>
            <SLabel>Active filters</SLabel>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:'0 0 8px' }}>
              {filters.risk_level!=='all'&&<CTag pair={C.tagCoolGray} onRemove={()=>onFilterChange({risk_level:'all'})}>Risk: {filters.risk_level}</CTag>}
              {filters.type!=='All types'&&<CTag pair={C.tagCoolGray} onRemove={()=>onFilterChange({type:'All types'})}>{filters.type}</CTag>}
              {filters.status!=='all'&&<CTag pair={C.tagCoolGray} onRemove={()=>onFilterChange({status:'all'})}>{STAT_CFG[filters.status]?.label}</CTag>}
              {(dateRange.start||dateRange.end)&&<CTag pair={C.tagCoolGray} onRemove={()=>onDateRangeChange({})}>Date: {dateRange.start||'...'} → {dateRange.end||'...'}</CTag>}
            </div>
          </>}
        </div>
        <div style={{ borderTop:`1px solid ${C.borderSubtle00}`, display:'flex' }}>
          <CBtn kind="secondary" size="lg" onClick={onClear} style={{ flex:1, justifyContent:'center', borderRight:`1px solid ${C.borderSubtle00}` }}>Clear all</CBtn>
          <CBtn kind="primary"   size="lg" onClick={()=>setOpen(false)} style={{ flex:1, justifyContent:'center' }}>Apply</CBtn>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ALERT ROW
═══════════════════════════════════════════════════════════════════════════ */
function AlertRow({ alert, selected, onClick, bulkMode, isBulkSelected, onBulkToggle }: {
  alert:Alert; selected:boolean; onClick:(a:Alert)=>void;
  bulkMode?:boolean; isBulkSelected?:boolean; onBulkToggle?:(id:string)=>void;
}) {
  const [hov, setHov] = useState(false);
  const sev  = SEV_CFG[alert.risk_level]  || SEV_CFG.info;
  const stat = STAT_CFG[alert.status]     || STAT_CFG.new;
  const sc   = scoreColor(alert.risk_score);
  return (
    <tr onClick={()=>bulkMode?undefined:onClick(alert)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:selected?C.highlight:hov?C.layerHover01:'transparent', borderLeft:`3px solid ${selected?sev.color:'transparent'}`, cursor:bulkMode?'default':'pointer', transition:'background 70ms' }}>
      {bulkMode&&<td style={{ padding:'10px 8px', textAlign:'center' }}><input type="checkbox" checked={isBulkSelected||false} onChange={()=>onBulkToggle?.(alert.id)} style={{ width:16, height:16, cursor:'pointer', accentColor:C.interactive }}/></td>}
      <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {alert.status==='new'&&<span style={{ width:6, height:6, borderRadius:'50%', background:sev.color, display:'inline-block', animation:'ila-blink 1.4s infinite', flexShrink:0 }}/>}
          <CTag pair={sev.tag} small>{sev.label}</CTag>
        </div>
      </td>
      <td style={{ padding:'10px 12px', maxWidth:0 }}>
        <div style={{ ...T.body01, color:C.textPrimary, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{alert.title}</div>
        <div style={{ ...T.code01, color:C.textHelper, marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{alert.id} · {alert.entity?.primary_identifier||alert.entity_id.slice(0,12)+'…'}</div>
      </td>
      <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}><span style={{ ...T.label01, color:C.textSecondary }}>{alert.alert_type}</span></td>
      <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}><CTag pair={stat.tag} small>{stat.label}</CTag></td>
      <td style={{ padding:'10px 12px', textAlign:'center' }}><span style={{ ...T.code02, color:sc, fontWeight:600 }}>{alert.risk_score}</span></td>
      <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}><span style={{ ...T.label01, color:C.textHelper }}>{timeAgo(alert.created_at)}</span></td>
      <td style={{ padding:'10px 8px', textAlign:'right' }}>{alert.status==='new'&&<CBtn kind="ghost" size="sm" onClick={e=>e.stopPropagation()}>ACK</CBtn>}</td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPLAIN + TIMELINE + DETAIL PANELS  (unchanged from original)
═══════════════════════════════════════════════════════════════════════════ */
function ExplainPanel({ data }: { data:ExplainData|null }) {
  if (!data) return <div style={{ padding:16, ...T.body01, color:C.textHelper }}>Loading risk breakdown…</div>;
  const LABELS: Record<string,string> = { anomaly_detection:'Anomaly detection', pattern_match:'Pattern match', network_centrality:'Network centrality', sentiment_signal:'Sentiment signal', activity_velocity:'Activity velocity' };
  return (
    <div>
      <SLabel>Score breakdown</SLabel>
      {Object.entries(data.score_breakdown).map(([key,val])=>(
        <div key={key} style={{ padding:'6px 16px 4px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ ...T.label01, color:C.textSecondary }}>{LABELS[key]||key}</span>
            <span style={{ ...T.code01, color:scoreColor(val*10) }}>{val.toFixed(1)}</span>
          </div>
          <CProgressBar value={val} max={10} color={scoreColor(val*10)}/>
        </div>
      ))}
      <div style={{ padding:'10px 16px', borderTop:`1px solid ${C.borderSubtle00}`, marginTop:8 }}>
        <div style={{ ...T.label01, color:C.textHelper, marginBottom:4 }}>Formula</div>
        <div style={{ ...T.code01, color:C.textSecondary, wordBreak:'break-all', lineHeight:'18px' }}>{data.formula}</div>
      </div>
      <SLabel>Top risk factors</SLabel>
      <div style={{ padding:'0 16px 12px', display:'flex', flexWrap:'wrap', gap:6 }}>
        {data.top_factors.map((f,i)=><CTag key={i} pair={C.tagYellow}>{f}</CTag>)}
        {!data.top_factors.length&&<span style={{ ...T.body01, color:C.textHelper }}>No factors available</span>}
      </div>
    </div>
  );
}

function TimelinePanel({ events, loading }: { events:TimelineEvent[]; loading:boolean }) {
  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:24 }}><CSpinner size={20}/></div>;
  if (!events.length) return <div style={{ padding:'16px', ...T.body01, color:C.textHelper }}>No source events found.</div>;
  const sentimentColor = (s?:number) => s==null?C.textDisabled:s>0.2?C.supportSuccess:s<-0.2?C.supportError:C.textHelper;
  return (
    <div>
      {events.map(ev=>(
        <div key={ev.id} style={{ borderBottom:`1px solid ${C.borderSubtle00}`, padding:'10px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
              <CTag pair={C.tagCoolGray} small>{ev.platform}</CTag>
              {ev.source&&<CTag pair={C.tagBlue} small>Tier {ev.source.tier}</CTag>}
            </div>
            <span style={{ ...T.label01, color:C.textHelper, flexShrink:0 }}>{timeAgo(ev.timestamp)}</span>
          </div>
          <p style={{ ...T.body01, color:C.textSecondary, margin:'4px 0', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{ev.content}</p>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
            {ev.author_handle&&<span style={{ ...T.code01, color:C.textHelper }}>{ev.author_handle}</span>}
            {ev.sentiment_score!=null&&<span style={{ ...T.label01, color:sentimentColor(ev.sentiment_score) }}>sentiment {ev.sentiment_score>0?'+':''}{ev.sentiment_score.toFixed(2)}</span>}
          </div>
          {ev.url&&<a href={ev.url} target="_blank" rel="noreferrer" style={{ ...T.label01, color:C.linkPrimary, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4, marginTop:4 }}>View source <IcoChevronRight/></a>}
        </div>
      ))}
    </div>
  );
}

type DetailTab = 'overview'|'explain'|'timeline';
function DetailPanel({ alert, fullDetail, explainData, timeline, timelineLoading, onStatusChange, onViewGraph, detailLoading }: {
  alert:Alert|null; fullDetail:AlertDetail|null; explainData:ExplainData|null;
  timeline:TimelineEvent[]; timelineLoading:boolean;
  onStatusChange:(id:string,next:string,note?:string)=>void;
  onViewGraph:(entityId:string)=>void; detailLoading:boolean;
}) {
  const [tab, setTab]   = useState<DetailTab>('overview');
  const [note, setNote] = useState('');
  useEffect(()=>{ setTab('overview'); setNote(''); },[alert?.id]);

  if (!alert) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:24 }}>
      <div style={{ color:C.borderStrong01 }}><IcoInformation/></div>
      <div style={{ ...T.heading01, color:C.textSecondary }}>No alert selected</div>
      <div style={{ ...T.body01, color:C.textHelper, textAlign:'center' }}>Select a row from the table to view details</div>
    </div>
  );

  const sev     = SEV_CFG[alert.risk_level]  || SEV_CFG.info;
  const stat    = STAT_CFG[alert.status]     || STAT_CFG.new;
  const sc      = scoreColor(alert.risk_score);
  const ed      = fullDetail?.entity as EntityDetail|undefined;
  const actions = STATUS_TRANSITIONS[alert.status] || [];
  const TABS: Array<{id:DetailTab;label:string}> = [{id:'overview',label:'Overview'},{id:'explain',label:'Explain'},{id:'timeline',label:'Timeline'}];

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ padding:'14px 16px', background:C.layer01, borderLeft:`4px solid ${sev.color}`, borderBottom:`1px solid ${C.borderSubtle01}`, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ ...T.heading02, color:C.textPrimary, marginBottom:4, wordBreak:'break-word' }}>{alert.title}</div>
            <div style={{ ...T.code01, color:C.textHelper }}>{alert.id} · {alert.alert_type}</div>
          </div>
          {detailLoading?<CSpinner size={20}/>:<div style={{ textAlign:'center', flexShrink:0 }}><div style={{ ...T.heading04, color:sc, lineHeight:1 }}>{alert.risk_score}</div><div style={{ ...T.label01, color:C.textHelper }}>Risk</div></div>}
        </div>
        <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
          <CTag pair={sev.tag}>{sev.label}</CTag>
          <CTag pair={stat.tag}>{stat.label}</CTag>
          {alert.entity?.entity_type&&<CTag pair={C.tagPurple}>{alert.entity.entity_type}</CTag>}
          {alert.matched_pattern&&<CTag pair={C.tagTeal} mono>{alert.matched_pattern}</CTag>}
        </div>
      </div>
      <div style={{ display:'flex', borderBottom:`1px solid ${C.borderSubtle01}`, background:C.layer01, flexShrink:0 }}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, height:40, background:'transparent', border:'none', borderBottom:`2px solid ${tab===t.id?C.interactive:'transparent'}`, color:tab===t.id?C.textPrimary:C.textSecondary, cursor:'pointer', ...T.label02, transition:'border-color 70ms' }}>{t.label}</button>)}
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        {tab==='overview'&&<>
          <CNotif kind={sev.notifKind as 'error'|'warning'|'success'|'info'} title={alert.alert_type} subtitle={alert.description}/>
          {alert.description&&<div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.borderSubtle00}` }}><div style={{ ...T.label01, color:C.textHelper, textTransform:'uppercase', marginBottom:6 }}>Description</div><p style={{ ...T.body01, color:C.textSecondary, margin:0 }}>{alert.description}</p></div>}
          {ed&&<><SLabel>Entity</SLabel><SRow label="Identifier" value={ed.primary_identifier} mono/>{ed.display_name&&<SRow label="Display name" value={ed.display_name}/>}<SRow label="Type" value={ed.entity_type}/><SRow label="Risk level" value={<CTag pair={sev.tag} small>{ed.risk_level}</CTag>}/><SRow label="Events seen" value={ed.event_count.toLocaleString()} mono/>{ed.last_seen&&<SRow label="Last seen" value={new Date(ed.last_seen).toLocaleString('en-IN',{hour12:false})}/>}</>}
          {(alert.risk_factors?.length)&&<><SLabel>Risk factors</SLabel><div style={{ padding:'0 16px 12px', display:'flex', flexWrap:'wrap', gap:6 }}>{alert.risk_factors.map((f,i)=><CTag key={i} pair={C.tagYellow}>{f}</CTag>)}</div></>}
          <div style={{ padding:'12px 16px', borderTop:`1px solid ${C.borderSubtle00}` }}>
            <div style={{ ...T.label01, color:C.textHelper, textTransform:'uppercase', marginBottom:8 }}>Status — <span style={{ color:stat.tag.text }}>{stat.label}</span></div>
            {actions.length>0&&<div style={{ marginBottom:10 }}><div style={{ ...T.label01, color:C.textHelper, marginBottom:4 }}>Analyst note (optional)</div><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add an investigation note…" rows={2} style={{ width:'100%', background:C.layer02, border:`1px solid ${C.borderSubtle01}`, borderRadius:0, color:C.textPrimary, padding:'8px 12px', ...T.body01, resize:'vertical', outline:'none', boxSizing:'border-box' }}/></div>}
            <div style={{ display:'inline-flex', gap:1, flexWrap:'wrap' }}>
              {actions.map(a=><CBtn key={a.next} kind={a.kind} size="md" onClick={()=>{ onStatusChange(alert.id,a.next,note); setNote(''); }}>{a.label}</CBtn>)}
              <CBtn kind="tertiary" size="md" icon={<IcoGraph/>} onClick={()=>onViewGraph(alert.entity_id)}>View graph</CBtn>
              <CBtn kind="ghost"    size="md" icon={<IcoExport/>}>Export</CBtn>
            </div>
          </div>
        </>}
        {tab==='explain'&&<ExplainPanel data={explainData}/>}
        {tab==='timeline'&&<TimelinePanel events={timeline} loading={timelineLoading}/>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const DEFAULT_FILTERS: Filters = { risk_level:'all', type:'All types', status:'all', sort:'risk_score|desc' };

export default function AlertsPage({ onNavigateToGraph }: { onNavigateToGraph?:(entityId:string)=>void }) {

  /* ── Core data ── */
  const [alerts,       setAlerts]       = useState<Alert[]>([]);
  const [displayedAlerts, setDisplayedAlerts] = useState<Alert[]>([]);  // what's shown (PAGE_SIZE at a time)
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(true);
  const [totalCount,   setTotalCount]   = useState(0);
  const [isLoading,    setIsLoading]    = useState(false);
  const [isLoadMore,   setIsLoadMore]   = useState(false);
  const [apiError,     setApiError]     = useState<string|null>(null);
  const [usingMock,    setUsingMock]    = useState(false);

  /* ── Stats ── */
  const [stats, setStats] = useState<DashboardStats|null>(null);

  /* ── Search / filters ── */
  const [searchInput, setSearchInput] = useState('');
  const [query,       setQuery]       = useState('');
  const [filters,     setFilters]     = useState<Filters>(DEFAULT_FILTERS);
  const [dateRange,   setDateRange]   = useState<{start?:string;end?:string}>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  /* ── Detail ── */
  const [selected,         setSelected]         = useState<Alert|null>(null);
  const [fullDetail,       setFullDetail]       = useState<AlertDetail|null>(null);
  const [detailLoading,    setDetailLoading]    = useState(false);
  const [explainData,      setExplainData]      = useState<ExplainData|null>(null);
  const [timeline,         setTimeline]         = useState<TimelineEvent[]>([]);
  const [timelineLoading,  setTimelineLoading]  = useState(false);

  /* ── Bulk ── */
  const [selectedAlerts,  setSelectedAlerts]  = useState<Set<string>>(new Set());
  const [bulkActionMode,  setBulkActionMode]  = useState(false);

  /* ── Live feed ── */
  const [liveCount, setLiveCount] = useState(0);

  /* ─────────────────────────────────────────────────────────────────────────
     AUTO-REFRESH STATE
     ─────────────────────────────────────────────────────────────────────────
     pendingBatch  — the 5 new alerts waiting to be merged
     showBanner    — is the blue bar visible?
     countdown     — ms remaining until forced refresh
  ───────────────────────────────────────────────────────────────────────── */
  const [pendingBatch,  setPendingBatch]  = useState<Alert[]>([]);
  const [showBanner,    setShowBanner]    = useState(false);
  const [countdown,     setCountdown]     = useState(REFRESH_INTERVAL_MS);
  const refreshTimerRef  = useRef<ReturnType<typeof setTimeout>>();
  const countdownTickRef = useRef<ReturnType<typeof setInterval>>();

  /* ── Infinite scroll ── */
  const sentinelRef = useRef<HTMLTableRowElement>(null);
  const fetchingRef = useRef(false);

  /* ══════════════════════════════════════════════════════════════════════════
     MOCK PAGINATION HELPER
  ══════════════════════════════════════════════════════════════════════════ */
  function loadMockPage(allFiltered: Alert[], pageNum: number) {
    const start = (pageNum - 1) * PAGE_SIZE;
    const chunk = allFiltered.slice(start, start + PAGE_SIZE);
    return { chunk, hasMore: start + PAGE_SIZE < allFiltered.length };
  }

  /* ══════════════════════════════════════════════════════════════════════════
     INITIAL LOAD — try API, fallback to mock
  ══════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    // Stats
    fetch(`${API_BASE}/api/v1/dashboard/stats`)
      .then(r => r.json()).then(setStats)
      .catch(() => setStats(MOCK_STATS));

    // Alerts page 1
    setIsLoading(true);
    const [sortBy, sortDir] = DEFAULT_FILTERS.sort.split('|');
    fetch(`${API_BASE}/api/v1/alerts?page=1&page_size=${PAGE_SIZE}&sort_by=${sortBy}&sort_dir=${sortDir}`)
      .then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        const results: Alert[] = data.items || data.data || data.results || [];
        setAlerts(results);
        setDisplayedAlerts(results);
        setTotalCount(data.total ?? results.length);
        setHasMore(results.length === PAGE_SIZE);
      })
      .catch(() => {
        // ✅ FALLBACK TO MOCK DATA
        setUsingMock(true);
        const filtered = applyMockFilters(MOCK_ALERTS, DEFAULT_FILTERS, '');
        const { chunk, hasMore: hm } = loadMockPage(filtered, 1);
        setAlerts(MOCK_ALERTS);        // full source
        setDisplayedAlerts(chunk);     // first 15
        setTotalCount(filtered.length);
        setHasMore(hm);
      })
      .finally(() => { setIsLoading(false); fetchingRef.current = false; });

    // SSE (best-effort)
    let es: EventSource;
    try {
      es = new EventSource(`${API_BASE}/api/v1/alerts/stream`);
      es.onmessage = () => setLiveCount(c => c + 1);
      es.onerror   = () => es.close();
    } catch { /* not available */ }
    return () => { es?.close(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ══════════════════════════════════════════════════════════════════════════
     AUTO-REFRESH TIMER — fires every 15 min
     1. Generates 5 new alerts
     2. Shows blue banner with countdown
     3. If user doesn't click "Refresh now", auto-refreshes at 0:00
  ══════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    function scheduleNextBatch() {
      clearTimeout(refreshTimerRef.current);
      clearInterval(countdownTickRef.current);

      setCountdown(REFRESH_INTERVAL_MS);
      let remaining = REFRESH_INTERVAL_MS;

      // Countdown tick every second
      countdownTickRef.current = setInterval(() => {
        remaining -= 1000;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(countdownTickRef.current);
        }
      }, 1000);

      // Main timer fires at 15 min
      refreshTimerRef.current = setTimeout(() => {
        const batch = generateNewBatch();
        setPendingBatch(batch);
        setShowBanner(true);
        setCountdown(0);
        clearInterval(countdownTickRef.current);
        // Auto-merge immediately since countdown hit 0
        mergeNewBatch(batch);
        scheduleNextBatch();  // schedule the NEXT 15-min cycle
      }, REFRESH_INTERVAL_MS);
    }

    scheduleNextBatch();
    return () => {
      clearTimeout(refreshTimerRef.current);
      clearInterval(countdownTickRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ══════════════════════════════════════════════════════════════════════════
     MERGE — prepend pending batch to displayed list
  ══════════════════════════════════════════════════════════════════════════ */
  function mergeNewBatch(batch?: Alert[]) {
    const toMerge = batch || pendingBatch;
    if (!toMerge.length) return;
    setDisplayedAlerts(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      return [...toMerge.filter(a => !existingIds.has(a.id)), ...prev];
    });
    setAlerts(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      return [...toMerge.filter(a => !existingIds.has(a.id)), ...prev];
    });
    setTotalCount(c => c + toMerge.length);
    setLiveCount(c => c + toMerge.length);
    setPendingBatch([]);
    setShowBanner(false);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     FILTER / SEARCH EFFECT — re-applies filters on mock data
  ══════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!usingMock) return;
    const filtered = applyMockFilters(alerts, filters, query);
    setTotalCount(filtered.length);
    const { chunk, hasMore: hm } = loadMockPage(filtered, 1);
    setDisplayedAlerts(chunk);
    setHasMore(hm);
    setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, query, usingMock]);

  /* ══════════════════════════════════════════════════════════════════════════
     INFINITE SCROLL — load more mock pages
  ══════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || !hasMore || isLoadMore) return;
      if (usingMock) {
        // Mock pagination
        setIsLoadMore(true);
        setTimeout(() => {
          const nextPage = page + 1;
          const filtered = applyMockFilters(alerts, filters, query);
          const { chunk, hasMore: hm } = loadMockPage(filtered, nextPage);
          setDisplayedAlerts(prev => {
            const ids = new Set(prev.map(a => a.id));
            return [...prev, ...chunk.filter(a => !ids.has(a.id))];
          });
          setHasMore(hm);
          setPage(nextPage);
          setIsLoadMore(false);
        }, 400);
      } else if (!fetchingRef.current) {
        setPage(p => p + 1);
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, isLoadMore, usingMock, page, alerts, filters, query]);

  /* ══════════════════════════════════════════════════════════════════════════
     API PAGINATION (non-mock)
  ══════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (usingMock || page === 1 || fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoadMore(true);
    const [sortBy, sortDir] = filters.sort.split('|');
    const params = new URLSearchParams({ page:String(page), page_size:String(PAGE_SIZE), sort_by:sortBy, sort_dir:sortDir, ...(query&&{search:query}), ...(filters.risk_level!=='all'&&{risk_level:filters.risk_level}), ...(filters.type!=='All types'&&{alert_type:filters.type}), ...(filters.status!=='all'&&{status:filters.status}), ...(dateRange.start&&{date_from:dateRange.start}), ...(dateRange.end&&{date_to:dateRange.end}) });
    fetch(`${API_BASE}/api/v1/alerts?${params}`)
      .then(r => r.json())
      .then(data => {
        const results: Alert[] = data.items || data.data || data.results || [];
        setDisplayedAlerts(prev => { const ids=new Set(prev.map(a=>a.id)); return [...prev,...results.filter(a=>!ids.has(a.id))]; });
        setHasMore(results.length===PAGE_SIZE);
      })
      .catch(err => setApiError(err.message))
      .finally(() => { setIsLoadMore(false); fetchingRef.current=false; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /* ── Handlers ── */
  function handleSearch(v: string) {
    setSearchInput(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setQuery(v); }, 350);
  }
  function handleFilterChange(patch: Partial<Filters>) {
    setFilters(prev => ({ ...prev, ...patch }));
    if (!usingMock) { setDisplayedAlerts([]); setPage(1); setHasMore(true); }
  }
  function handleClearFilters() {
    setFilters(DEFAULT_FILTERS); setDateRange({}); setQuery(''); setSearchInput('');
    setSelectedAlerts(new Set()); setBulkActionMode(false);
    if (!usingMock) { setDisplayedAlerts([]); setPage(1); setHasMore(true); }
  }

  const handleSelectAlert = useCallback((alert: Alert) => {
    setSelected(alert);
    setFullDetail(null); setExplainData(null); setTimeline([]);
    setDetailLoading(true); setTimelineLoading(true);

    if (usingMock) {
      // Serve mock detail / explain / timeline instantly
      setTimeout(() => {
        setFullDetail({ ...alert, entity: alert.entity as EntityDetail });
        setDetailLoading(false);
        setExplainData(MOCK_EXPLAIN);
        setTimeline(MOCK_TIMELINE);
        setTimelineLoading(false);
      }, 300);
      return;
    }

    fetch(`${API_BASE}/api/v1/alerts/${alert.id}`).then(r=>r.json()).then(d=>setFullDetail(d)).catch(()=>{}).finally(()=>setDetailLoading(false));
    fetch(`${API_BASE}/api/v1/entities/${alert.entity_id}/explain`).then(r=>r.json()).then(setExplainData).catch(()=>{});
    fetch(`${API_BASE}/api/v1/entities/${alert.entity_id}/timeline?page=1&page_size=10`).then(r=>r.json()).then(d=>setTimeline(d.items||[])).catch(()=>{}).finally(()=>setTimelineLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usingMock]);

  const handleStatusChange = useCallback(async (id: string, next: string, note?: string) => {
    // Optimistic update always works (mock or live)
    setDisplayedAlerts(prev => prev.map(a => a.id===id ? {...a,status:next} : a));
    setAlerts(prev           => prev.map(a => a.id===id ? {...a,status:next} : a));
    setSelected(prev         => prev?.id===id ? {...prev,status:next} : prev);
    setFullDetail(prev       => prev?.id===id ? {...prev,status:next} : prev);

    if (!usingMock) {
      try {
        const res = await fetch(`${API_BASE}/api/v1/alerts/${id}/status`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status:next,...(note&&{analyst_note:note})}) });
        if (!res.ok) throw new Error();
      } catch { /* already updated optimistically */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usingMock]);

  function handleRefresh() {
    setDisplayedAlerts([]); setPage(1); setHasMore(true);
    setLiveCount(0); setSelected(null); setFullDetail(null);
    setExplainData(null); setTimeline([]); setSelectedAlerts(new Set());
    setPendingBatch([]); setShowBanner(false);

    if (usingMock) {
      const filtered = applyMockFilters(alerts, filters, query);
      const { chunk, hasMore: hm } = loadMockPage(filtered, 1);
      setDisplayedAlerts(chunk); setTotalCount(filtered.length); setHasMore(hm);
    }
  }

  /* ── Derived ── */
  const activeFilterCount = [filters.risk_level!=='all', filters.type!=='All types', filters.status!=='all', dateRange.start||dateRange.end].filter(Boolean).length;
  const COLS = [...(bulkActionMode?[{label:'',w:40}]:[]), {label:'SEVERITY',w:110}, {label:'TITLE / ENTITY',w:undefined}, {label:'TYPE',w:120}, {label:'STATUS',w:110}, {label:'RISK',w:64}, {label:'TIME',w:100}, {label:'',w:72}];

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:C.background, overflow:'hidden', fontFamily:"'IBM Plex Sans', Arial, sans-serif", color:C.textPrimary }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        @keyframes ila-spin   { to { transform: rotate(360deg); } }
        @keyframes ila-blink  { 0%,100% { opacity:1 } 50% { opacity:0.15 } }
        @keyframes ila-fadein { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${C.borderStrong01}; }
        input::placeholder, textarea::placeholder { color:${C.textPlaceholder}; }
        select option { background:${C.layer02}; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter:invert(0.5); cursor:pointer; }
        textarea { font-family:'IBM Plex Sans', Arial, sans-serif; }
        tr { animation: ila-fadein 0.18s ease; }
      `}</style>

      {/* ═════ PAGE HEADER ═════ */}
      <div style={{ background:C.layer01, borderBottom:`1px solid ${C.borderSubtle01}`, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', ...T.label01, color:C.textHelper }}>
          <span>ILA</span><IcoChevronRight/><span style={{ color:C.textPrimary }}>Alert management</span>
          {usingMock && (
            <span style={{ ...T.code01, background:C.tagYellow.bg, color:C.tagYellow.text, padding:'1px 8px', marginLeft:8, fontSize:10, letterSpacing:'0.4px', fontWeight:600 }}>
              MOCK DATA
            </span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', padding:'0 16px 14px', gap:16, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ ...T.heading05, color:C.textPrimary, margin:0 }}>Alert management</h1>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6, ...T.label01, color:C.supportSuccess }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:C.supportSuccess, display:'inline-block', animation:'ila-blink 1.4s infinite' }}/>
              System live
              {liveCount>0 && <CTag pair={C.tagRed}>+{liveCount} new</CTag>}
            </div>
          </div>
          {stats && (
            <div style={{ display:'flex', flexShrink:0 }}>
              <KpiCard label="Total entities"  value={stats.total_entities}  border={C.borderSubtle00}/>
              <KpiCard label="Alerts today"    value={stats.alerts_today}    color={C.supportWarning} border={C.supportWarning}/>
              <KpiCard label="Critical / new"  value={stats.critical_alerts} color={C.supportError}   border={C.supportError}/>
              <KpiCard label="Active sources"  value={stats.active_sources}  border={C.borderSubtle00}/>
              <div style={{ padding:'12px 20px', background:C.layer01, borderLeft:`1px solid ${C.borderSubtle00}` }}>
                <Sparkline data={stats.alerts_last_24h_by_hour}/>
                <div style={{ ...T.label01, color:C.textHelper, marginTop:4 }}>Alerts / 24h</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═════ TOOLBAR ═════ */}
      <div style={{ background:C.layer01, borderBottom:`1px solid ${C.borderSubtle01}`, padding:'0 16px', display:'flex', alignItems:'center', gap:8, height:56, flexShrink:0, flexWrap:'wrap' }}>
        <div style={{ display:'flex', border:`1px solid ${C.borderSubtle01}` }}>
          {RISK_LEVELS.slice(0,4).map(rl => {
            const active = filters.risk_level===rl;
            return <button key={rl} onClick={()=>handleFilterChange({risk_level:rl})} style={{ height:40, padding:'0 14px', background:active?C.layer02:'transparent', color:active?C.textPrimary:C.textSecondary, border:'none', borderRight:`1px solid ${C.borderSubtle01}`, outline:active?`2px solid ${C.interactive}`:'none', outlineOffset:-2, ...T.label02, cursor:'pointer', transition:'background 70ms', textTransform:'capitalize' }}>{rl==='all'?'All':SEV_CFG[rl]?.label||rl}</button>;
          })}
        </div>
        <CSelect value={filters.sort} onChange={v=>handleFilterChange({sort:v})} options={SORT_OPTIONS} width={180}/>
        {activeFilterCount>0 && (
          <div style={{ display:'flex', alignItems:'center', gap:6, ...T.label01, color:C.textHelper }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:C.interactive, display:'inline-block' }}/>
            {activeFilterCount} filter{activeFilterCount>1?'s':''} active
            <button onClick={handleClearFilters} style={{ background:'none', border:'none', cursor:'pointer', color:C.linkPrimary, ...T.label01, padding:0 }}>Clear</button>
          </div>
        )}
        <div style={{ flex:1 }}/>
        {bulkActionMode ? (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ ...T.label01, color:C.textHelper }}>{selectedAlerts.size} selected</span>
            <CBtn kind="secondary" size="sm" disabled={selectedAlerts.size===0} onClick={()=>{ selectedAlerts.forEach(id=>handleStatusChange(id,'investigating','Bulk investigation')); setSelectedAlerts(new Set()); }}>Start Investigation</CBtn>
            <CBtn kind="secondary" size="sm" disabled={selectedAlerts.size===0} icon={<IcoExport/>}
              onClick={()=>{
                const sd = displayedAlerts.filter(a=>selectedAlerts.has(a.id));
                const csv = [['ID','Title','Type','Status','Risk Score','Entity','Created'].join(','), ...sd.map(a=>[a.id,`"${a.title}"`,a.alert_type,a.status,a.risk_score,`"${a.entity?.primary_identifier||a.entity_id}"`,a.created_at].join(','))].join('\n');
                const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
                const a=document.createElement('a'); a.href=url; a.download=`alerts_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
                setSelectedAlerts(new Set());
              }}>Export</CBtn>
            <CBtn kind="ghost" size="sm" onClick={()=>{ setBulkActionMode(false); setSelectedAlerts(new Set()); }}>Cancel</CBtn>
          </div>
        ) : (
          <CBtn kind="ghost" size="md" onClick={()=>setBulkActionMode(true)}>Bulk Actions</CBtn>
        )}
        <CInput value={searchInput} onChange={handleSearch} placeholder="Search alerts, entities, IDs…" width={300} icon={<IcoSearch/>}/>
        <CBtn kind="ghost" size="md" icon={<IcoRefresh/>} onClick={handleRefresh}/>
        <FilterPanel filters={filters} onFilterChange={handleFilterChange} onClear={handleClearFilters} resultCount={displayedAlerts.length} dateRange={dateRange} onDateRangeChange={setDateRange}/>
      </div>

      {/* ═════ AUTO-REFRESH BANNER (appears 15 min after load) ═════ */}
      {showBanner && (
        <RefreshBanner
          newCount={pendingBatch.length || 5}
          countdown={countdown}
          onRefreshNow={() => mergeNewBatch()}
          onDismiss={() => setShowBanner(false)}
        />
      )}

      {apiError && <CNotif kind="error" title="Failed to load alerts" subtitle={apiError} onClose={()=>setApiError(null)}/>}

      {/* ═════ BODY ═════ */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* DATA TABLE */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
          {/* Sticky header */}
          <table style={{ width:'100%', borderCollapse:'collapse', flexShrink:0, tableLayout:'fixed' }}>
            <colgroup>{COLS.map((c,i)=><col key={i} style={c.w?{width:c.w}:{}}/>)}</colgroup>
            <thead>
              <tr style={{ background:C.layer02, borderBottom:`1px solid ${C.borderStrong01}` }}>
                {COLS.map((c,i)=>(
                  <th key={c.label||i} style={{ padding:'10px 12px', ...T.productive01, color:C.textHelper, textAlign:c.label===''?'right':'left', letterSpacing:'0.32px', whiteSpace:'nowrap', userSelect:'none' }}>
                    {bulkActionMode&&i===0 ? (
                      <input type="checkbox" checked={selectedAlerts.size===displayedAlerts.length&&displayedAlerts.length>0}
                        onChange={e=>{ if(e.target.checked) setSelectedAlerts(new Set(displayedAlerts.map(a=>a.id))); else setSelectedAlerts(new Set()); }}
                        style={{ width:16, height:16, cursor:'pointer', accentColor:C.interactive }}/>
                    ) : c.label}
                  </th>
                ))}
              </tr>
            </thead>
          </table>

          {/* Scrollable rows */}
          <div style={{ flex:1, overflowY:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
              <colgroup>{COLS.map((c,i)=><col key={i} style={c.w?{width:c.w}:{}}/>)}</colgroup>
              <tbody>
                {isLoading&&displayedAlerts.length===0&&(
                  <tr><td colSpan={COLS.length} style={{ padding:48, textAlign:'center' }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
                      <CSpinner size={32}/>
                      <span style={{ ...T.body01, color:C.textHelper }}>Loading alerts…</span>
                    </div>
                  </td></tr>
                )}
                {!isLoading&&displayedAlerts.length===0&&(
                  <tr><td colSpan={COLS.length} style={{ padding:64, textAlign:'center' }}>
                    <div style={{ color:C.borderStrong01, marginBottom:8 }}><IcoWarning/></div>
                    <div style={{ ...T.heading01, color:C.textSecondary, marginBottom:6 }}>No alerts match</div>
                    <div style={{ ...T.body01, color:C.textHelper, marginBottom:14 }}>Try adjusting or clearing your filters</div>
                    <CBtn kind="ghost" size="md" onClick={handleClearFilters}>Clear all filters</CBtn>
                  </td></tr>
                )}
                {displayedAlerts.map(alert=>(
                  <AlertRow key={alert.id} alert={alert} selected={selected?.id===alert.id} onClick={handleSelectAlert}
                    bulkMode={bulkActionMode} isBulkSelected={selectedAlerts.has(alert.id)}
                    onBulkToggle={id=>{ const n=new Set(selectedAlerts); n.has(id)?n.delete(id):n.add(id); setSelectedAlerts(n); }}/>
                ))}
                <tr ref={sentinelRef}><td colSpan={COLS.length} style={{ height:1 }}/></tr>
                {isLoadMore&&(
                  <tr><td colSpan={COLS.length} style={{ padding:14, textAlign:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                      <CSpinner size={16}/>
                      <span style={{ ...T.label01, color:C.textHelper }}>Loading more…</span>
                    </div>
                  </td></tr>
                )}
                {!hasMore&&displayedAlerts.length>0&&(
                  <tr><td colSpan={COLS.length}>
                    <div style={{ padding:'10px 16px', textAlign:'center', ...T.label01, color:C.textHelper, borderTop:`1px solid ${C.borderSubtle00}` }}>
                      All {totalCount.toLocaleString()} results loaded
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Status bar */}
          <div style={{ height:40, padding:'0 16px', borderTop:`1px solid ${C.borderSubtle01}`, display:'flex', alignItems:'center', gap:16, background:C.layer01, flexShrink:0 }}>
            <span style={{ ...T.label01, color:C.textHelper }}>
              {displayedAlerts.length.toLocaleString()} of {totalCount.toLocaleString()} items
              {activeFilterCount>0?` · ${activeFilterCount} filter${activeFilterCount>1?'s':''} applied`:''}
              {usingMock?' · Mock data mode':''}
            </span>
            <span style={{ marginLeft:'auto', ...T.label01, color:C.textHelper }}>
              Next refresh: <strong style={{ ...T.code01, color:C.textSecondary }}>{formatCountdown(countdown)}</strong>
              &nbsp;·&nbsp;Last sync: {new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:false})}
            </span>
          </div>
        </div>

        {/* DETAIL PANEL */}
        <div style={{ width:380, minWidth:380, flexShrink:0, display:'flex', flexDirection:'column', background:C.layer01, borderLeft:`1px solid ${C.borderSubtle01}`, overflow:'hidden' }}>
          <div style={{ height:40, padding:'0 16px', borderBottom:`1px solid ${C.borderSubtle01}`, display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <span style={{ ...T.heading01, color:C.textSecondary }}>Alert detail</span>
            {selected&&<CTag pair={C.tagCoolGray} small mono>{selected.id}</CTag>}
          </div>
          <DetailPanel alert={selected} fullDetail={fullDetail} explainData={explainData} timeline={timeline} timelineLoading={timelineLoading} onStatusChange={handleStatusChange} onViewGraph={onNavigateToGraph||(() => {})} detailLoading={detailLoading}/>
        </div>
      </div>
    </div>
  );
}

/*
═══════════════════════════════════════════════════════════════════════════════
  USAGE
═══════════════════════════════════════════════════════════════════════════════

  // App.tsx
  import AlertsPage from './AlertsPage';

  function App() {
    return <AlertsPage onNavigateToGraph={(entityId) => console.log(entityId)} />;
  }

  // No JSON file needed — mock data is embedded.
  // To use real API: set API_BASE to your FastAPI server URL.
  // To adjust refresh interval: change REFRESH_INTERVAL_MS (default: 15 min).

═══════════════════════════════════════════════════════════════════════════════
*/