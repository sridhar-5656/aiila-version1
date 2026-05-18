// ─── Alert Types ───────────────────────────────────────────────────────────────
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  source: string;
  risk_score: number;
  entity_id?: string;
  entity_name?: string;
  timestamp: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// ─── Entity Types ───────────────────────────────────────────────────────────────
export type EntityType = 'person' | 'organization' | 'domain' | 'ip' | 'url' | 'hash';

export interface Entity {
  id: string;
  name?: string;
  display_name?: string;
  primary_identifier?: string;
  type?: EntityType;
  entity_type?: string;
  risk_score: number;
  risk_level?: string;
  description?: string;
  aliases?: string[];
  tags?: string[];
  first_seen: string;
  last_seen: string;
  event_count?: number;
  metadata?: Record<string, any>;
  linked_entities?: string[];
}

// ─── Graph Types ────────────────────────────────────────────────────────────────
export interface GraphNode {
  id: string;
  label: string;
  type: EntityType;
  risk_score?: number;
  x?: number;
  y?: number;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  weight?: number;
  metadata?: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Evidence Types ─────────────────────────────────────────────────────────────
export type EvidenceType = 'document' | 'image' | 'url' | 'social_post' | 'network_log' | 'other';

export interface Evidence {
  id: string;
  title: string;
  type: EvidenceType;
  source_url?: string;
  content?: string;
  entity_ids?: string[];
  alert_ids?: string[];
  collected_at: string;
  hash?: string;
  metadata?: Record<string, any>;
}

// ─── Source Monitor Types ───────────────────────────────────────────────────────
export type SourceStatus = 'active' | 'inactive' | 'error' | 'rate_limited';

export interface Source {
  id: string;
  name: string;
  url: string;
  type: string;
  status: SourceStatus;
  last_checked?: string;
  error_message?: string;
  keywords?: string[];
  metadata?: Record<string, any>;
}

// ─── Keyword Types ──────────────────────────────────────────────────────────────
export interface Keyword {
  id: string;
  value: string;
  category?: string;
  alert_count?: number;
  created_at: string;
}

// ─── Investigation Types ────────────────────────────────────────────────────────
export type InvestigationStatus = 'open' | 'in_progress' | 'closed';

export interface Investigation {
  id: string;
  title: string;
  description?: string;
  status: InvestigationStatus;
  entity_ids?: string[];
  alert_ids?: string[];
  created_at: string;
  updated_at: string;
  assignee?: string;
  tags?: string[];
}

// ─── User / Auth Types ──────────────────────────────────────────────────────────
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  token?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ─── API Types ──────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

// ─── Dashboard / Stats Types ────────────────────────────────────────────────────
export interface ChartDataPoint {
  hour: string;
  count: number;
}

export interface RiskMetrics {
  avg_entity_risk_score: number;
  entities_high_or_critical: number;
}

export interface DashboardStats {
  total_alerts: number;
  open_alerts: number;
  critical_alerts: number;
  high_alerts: number;
  total_entities: number;
  total_entities_tracked: number;
  flagged_entities: number;
  alerts_today: number;
  high_risk_entities: number;
  active_sources: number;
  events_today: number;
  risk_metrics: RiskMetrics;
  alerts_last_24h_by_hour: ChartDataPoint[];
  top_risk_entities: Entity[];
  recent_alerts: Alert[];
}

// ─── Search Result Types ─────────────────────────────────────────────────────────
export type SearchResultKind = 'entity' | 'alert' | 'event';

export interface SearchResultEntity {
  kind: 'entity';
  score: number;
  id: string;
  riskScore?: number;
  riskLevel?: string;
  title: string;
  badge: string;
  snippet: null;
  platform: null;
  publishedAt: null;
  status: null;
  navigateTo: string;
}

export interface SearchResultAlert {
  kind: 'alert';
  score: number;
  id: string;
  riskScore?: number;
  riskLevel?: string;
  title: string;
  badge: string;
  snippet: null;
  platform: null;
  publishedAt: null;
  status: string;
  navigateTo: string;
}

export interface SearchResultEvent {
  kind: 'event';
  score: number;
  id: string;
  riskScore?: number;
  riskLevel?: string;
  title: string;
  badge: string;
  snippet: string;
  platform: string;
  publishedAt: string;
  status: null;
  navigateTo: string;
}

export type SearchResult = SearchResultEntity | SearchResultAlert | SearchResultEvent;

export interface SearchMeta {
  query: string;
  total: number;
  totalPages: number;
  page: number;
}

export interface SearchResponse {
  items: SearchResult[];
  total: number;
  totalPages: number;
  query: string;
}

// ─── WebSocket Message Types ────────────────────────────────────────────────────
export type WsMessageType = 'alert' | 'entity_update' | 'source_update' | 'ping';

export interface WsMessage {
  type: WsMessageType;
  payload: any;
  timestamp: string;
}
