/**
 * GraphVisualization.tsx
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';

// Carbon React components
import {
  Button,
  ContentSwitcher,
  InlineLoading,
  InlineNotification,
  Layer,
  Switch,
  Tag,
  Tooltip,
} from '@carbon/react';

// Carbon Icons
import {
  FitToScreen,
  Reset,
  ZoomIn,
  ZoomOut,
} from '@carbon/icons-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EntityType =
  | 'Person'
  | 'Phone'
  | 'SocialAccount'
  | 'UPI'
  | string;

export interface GraphNode {
  id: string;
  label: string;
  type: EntityType;
  risk_score?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  __indexColor?: string;
}

export interface GraphEdge {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  label?: string;
  weight?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  node_count: number;
  edge_count: number;
}

interface GraphVisualizationProps {
  entityId: string;
  apiBase?: string;
  onNavigate?: (entityId: string) => void;
  height?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#161616',
  surface: '#262626',
  border: '#393939',
  textPrimary: '#f4f4f4',
  textSecondary: '#c6c6c6',
  textDisabled: '#6f6f6f',

  Person: '#0f62fe',
  Phone: '#24a148',
  SocialAccount: '#ff832b',
  UPI: '#8a3ffc',
  Default: '#4d5358',

  riskHigh: '#da1e28',
  riskMed: '#f1c21b',
  riskLow: '#24a148',

  link: '#525252',
  linkHighlight: '#0f62fe',
};

const NODE_RADIUS = 14;

const TYPE_COLOR: Record<string, string> = {
  Person: COLORS.Person,
  Phone: COLORS.Phone,
  SocialAccount: COLORS.SocialAccount,
  UPI: COLORS.UPI,
};

const TYPE_TAG_TYPE: Record<string, 'blue' | 'green' | 'warm-gray' | 'purple' | 'cool-gray'> = {
  Person: 'blue',
  Phone: 'green',
  SocialAccount: 'warm-gray',
  UPI: 'purple',
};

const HOP_OPTIONS = ['1', '2', '3'] as const;
type Hops = (typeof HOP_OPTIONS)[number];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nodeColor(node: GraphNode): string {
  return TYPE_COLOR[node.type] ?? COLORS.Default;
}

function riskRingColor(score?: number): string | null {
  if (score == null) return null;
  if (score >= 70) return COLORS.riskHigh;
  if (score >= 40) return COLORS.riskMed;
  return COLORS.riskLow;
}

// ─── Component ───────────────────────────────────────────────────────────────

const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  entityId,
  apiBase = '',
  onNavigate,
  height = 560,
}) => {
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphEdge>>();

  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphEdge[] }>({
    nodes: [],
    links: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hops, setHops] = useState<Hops>('1');
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());

  // ── Physics Tuning (Fixes Central Clustering) ──────────────────────────────
  useEffect(() => {
    if (fgRef.current) {
      // Increase repulsion (charge) and link distance to spread nodes out
      fgRef.current.d3Force('charge')?.strength(-450);
      fgRef.current.d3Force('link')?.distance(120);
      fgRef.current.d3Force('center')?.strength(0.05);
    }
  }, [graphData]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!entityId) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `${apiBase}/api/v1/graph/entity/${entityId}/neighbors?hops=${hops}`;
        const res = await fetch(url);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? `HTTP ${res.status}`);
        }
        const data: GraphData = await res.json();
        if (!cancelled) {
          setGraphData({
            nodes: data.nodes,
            links: data.edges,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load graph data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [entityId, hops, apiBase]);

  // ── Highlight helpers ──────────────────────────────────────────────────────
  const updateHighlights = useCallback((node: GraphNode | null) => {
    const nodes = new Set<string>();
    const links = new Set<string>();
    if (node) {
      nodes.add(node.id);
      graphData.links.forEach((link) => {
        const srcId = typeof link.source === 'object' ? (link.source as GraphNode).id : link.source;
        const tgtId = typeof link.target === 'object' ? (link.target as GraphNode).id : link.target;
        if (srcId === node.id || tgtId === node.id) {
          links.add(link.id);
          nodes.add(srcId);
          nodes.add(tgtId);
        }
      });
    }
    setHighlightNodes(nodes);
    setHighlightLinks(links);
  }, [graphData.links]);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node ?? null);
    updateHighlights(node);
  }, [updateHighlights]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    fgRef.current?.centerAt(node.x, node.y, 600);
    fgRef.current?.zoom(2.5, 600);
  }, []);

  const handleNavigate = useCallback(() => {
    if (selectedNode) onNavigate?.(selectedNode.id);
  }, [selectedNode, onNavigate]);

  // ── Canvas draw callbacks ──────────────────────────────────────────────────
  const drawNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const { x = 0, y = 0 } = node;
      const r = NODE_RADIUS / Math.max(1, Math.sqrt(globalScale) * 0.7);
      const isSelected = selectedNode?.id === node.id;
      const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node.id);
      const color = nodeColor(node);
      const alpha = isHighlighted ? 1 : 0.2;

      if (isSelected) {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(x, y, r + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.9;
        ctx.stroke();
        ctx.restore();
      }

      const riskColor = riskRingColor(node.risk_score);
      if (riskColor) {
        ctx.beginPath();
        ctx.arc(x, y, r + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = riskColor;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = alpha * 0.85;
        ctx.stroke();
      }

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color + '33';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      const fontSize = Math.max(8, 11 / Math.max(1, globalScale * 0.6));
      ctx.font = `600 ${fontSize}px 'IBM Plex Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isHighlighted ? COLORS.textPrimary : COLORS.textDisabled;
      const maxChars = Math.floor(r * 1.6 / (fontSize * 0.6));
      const label = node.label.length > maxChars
        ? node.label.slice(0, maxChars - 1) + '…'
        : node.label;
      ctx.fillText(label, x, y);

      ctx.globalAlpha = 1;
    },
    [highlightNodes, selectedNode],
  );

  const drawLink = useCallback(
    (link: GraphEdge, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const src = link.source as GraphNode;
      const tgt = link.target as GraphNode;
      if (!src?.x || !tgt?.x) return;

      const isHighlighted = highlightLinks.size === 0 || highlightLinks.has(link.id);
      ctx.globalAlpha = isHighlighted ? 0.85 : 0.12;
      ctx.strokeStyle = isHighlighted ? COLORS.linkHighlight : COLORS.link;
      ctx.lineWidth = isHighlighted ? 1.8 : 1;

      ctx.beginPath();
      ctx.moveTo(src.x!, src.y!);
      ctx.lineTo(tgt.x!, tgt.y!);
      ctx.stroke();

      // Relationship Labels on edges
      if (link.label && globalScale > 1.2) {
        const mx = (src.x! + tgt.x!) / 2;
        const my = (src.y! + tgt.y!) / 2;
        const angle = Math.atan2(tgt.y! - src.y!, tgt.x! - src.x!);
        
        ctx.save();
        ctx.translate(mx, my);
        // Flip text if upside down
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) ctx.rotate(angle + Math.PI);
        else ctx.rotate(angle);

        ctx.font = `${10 / globalScale + 6}px 'IBM Plex Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = isHighlighted ? COLORS.textSecondary : COLORS.textDisabled;
        ctx.fillText(link.label, 0, -2);
        ctx.restore();
      }

      ctx.globalAlpha = 1;
    },
    [highlightLinks],
  );

  // ── Legend ─────────────────────────────────────────────────────────────────
  const activeTypes = useMemo(() => {
    return Array.from(new Set(graphData.nodes.map((n) => n.type)));
  }, [graphData.nodes]);

  // ── Zoom controls ──────────────────────────────────────────────────────────
  const handleZoomIn = () => {
    const currentZoom = (fgRef.current as any)?._zoom?.k ?? 1;
    fgRef.current?.zoom(currentZoom * 1.4, 300);
  };
  const handleZoomOut = () => {
    const currentZoom = (fgRef.current as any)?._zoom?.k ?? 1;
    fgRef.current?.zoom(currentZoom * 0.7, 300);
  };
  const handleFit = () => fgRef.current?.zoomToFit(400, 40);
  const handleReset = () => {
    setSelectedNode(null);
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
    fgRef.current?.zoomToFit(400, 40);
  };

  return (
    <Layer>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        .gv-root { font-family: 'IBM Plex Sans', sans-serif; background: ${COLORS.bg}; border: 1px solid ${COLORS.border}; overflow: hidden; position: relative; }
        .gv-toolbar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: ${COLORS.surface}; border-bottom: 1px solid ${COLORS.border}; }
        .gv-toolbar-title { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600; color: ${COLORS.textSecondary}; text-transform: uppercase; flex: 1; }
        .gv-toolbar-title span { color: ${COLORS.Person}; }
        .gv-hop-label { font-size: 11px; color: ${COLORS.textDisabled}; margin-right: 4px; }
        .gv-zoom-controls { display: flex; gap: 2px; }
        .gv-canvas { position: relative; background: ${COLORS.bg}; }
        .gv-legend { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: ${COLORS.surface}; border-top: 1px solid ${COLORS.border}; }
        .gv-legend-label { font-size: 11px; color: ${COLORS.textDisabled}; font-family: 'IBM Plex Mono', monospace; text-transform: uppercase; }
        .gv-info-panel { position: absolute; bottom: 52px; right: 16px; width: 240px; background: ${COLORS.surface}; border: 1px solid ${COLORS.border}; padding: 16px; z-index: 10; animation: gv-slide-up 0.2s ease-out; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        @keyframes gv-slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .gv-info-type { font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
        .gv-info-label { font-size: 14px; font-weight: 600; color: ${COLORS.textPrimary}; margin-bottom: 12px; }
        .gv-info-meta { font-size: 11px; color: ${COLORS.textSecondary}; margin-bottom: 4px; font-family: 'IBM Plex Mono', monospace; }
        .gv-info-close { position: absolute; top: 8px; right: 8px; cursor: pointer; color: ${COLORS.textDisabled}; border: none; background: transparent; font-size: 18px; }
        .gv-loading-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: ${COLORS.bg}cc; z-index: 20; }
        .gv-risk-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 600; }
        .gv-risk-high { background: ${COLORS.riskHigh}22; color: ${COLORS.riskHigh}; }
        .gv-risk-med  { background: ${COLORS.riskMed}22;  color: ${COLORS.riskMed}; }
        .gv-risk-low  { background: ${COLORS.riskLow}22;  color: ${COLORS.riskLow}; }
      `}</style>

      <div className="gv-root" style={{ width: '100%' }}>
        <div className="gv-toolbar">
          <div className="gv-toolbar-title">
            Graph Intelligence / <span>{graphData.nodes.length} nodes</span> &nbsp;·&nbsp; {graphData.links.length} edges
          </div>

          <span className="gv-hop-label">Hops</span>
          <ContentSwitcher
            size="sm"
            selectedIndex={HOP_OPTIONS.indexOf(hops)}
            onChange={({ index }) => setHops(HOP_OPTIONS[index as number])}
          >
            {HOP_OPTIONS.map((h) => (
              <Switch key={h} name={h} text={h} />
            ))}
          </ContentSwitcher>

          <div className="gv-zoom-controls">
            <Button kind="ghost" size="sm" renderIcon={ZoomIn} hasIconOnly onClick={handleZoomIn} iconDescription="Zoom in" />
            <Button kind="ghost" size="sm" renderIcon={ZoomOut} hasIconOnly onClick={handleZoomOut} iconDescription="Zoom out" />
            <Button kind="ghost" size="sm" renderIcon={FitToScreen} hasIconOnly onClick={handleFit} iconDescription="Fit to screen" />
            <Button kind="ghost" size="sm" renderIcon={Reset} hasIconOnly onClick={handleReset} iconDescription="Reset" />
          </div>
        </div>

        {error && (
          <InlineNotification kind="error" title="Failed to load graph" subtitle={error} lowContrast onClose={() => setError(null)} />
        )}

        <div className="gv-canvas" style={{ height }}>
          {loading && (
            <div className="gv-loading-overlay">
              <InlineLoading description="Loading graph data…" style={{ color: COLORS.textSecondary }} />
            </div>
          )}

          {!loading && graphData.nodes.length > 0 && (
            <ForceGraph2D
              ref={fgRef as any}
              graphData={graphData}
              height={height}
              backgroundColor={COLORS.bg}
              nodeId="id"
              linkSource="source"
              linkTarget="target"
              nodeCanvasObject={drawNode as any}
              nodeCanvasObjectMode={() => 'replace'}
              linkCanvasObject={drawLink as any}
              linkCanvasObjectMode={() => 'replace'}
              onNodeHover={handleNodeHover as any}
              onNodeClick={handleNodeClick as any}
              cooldownTicks={100}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              enableNodeDrag
            />
          )}

          {selectedNode && (
            <div className="gv-info-panel">
              <button className="gv-info-close" onClick={() => setSelectedNode(null)}>×</button>
              <div className="gv-info-type" style={{ color: nodeColor(selectedNode) }}>{selectedNode.type}</div>
              <div className="gv-info-label">{selectedNode.label}</div>
              <div className="gv-info-meta">ID: {selectedNode.id.slice(0, 12)}...</div>
              
              {selectedNode.risk_score != null && (
                <div style={{ marginBottom: 16 }}>
                   <span className={`gv-risk-badge ${selectedNode.risk_score >= 70 ? 'gv-risk-high' : selectedNode.risk_score >= 40 ? 'gv-risk-med' : 'gv-risk-low'}`}>
                    ⬤ {selectedNode.risk_score >= 70 ? 'HIGH' : selectedNode.risk_score >= 40 ? 'MED' : 'LOW'} {selectedNode.risk_score}
                  </span>
                </div>
              )}

              <Button kind="primary" size="sm" style={{ width: '100%' }} onClick={handleNavigate}>
                View Profile →
              </Button>
            </div>
          )}
        </div>

        <div className="gv-legend">
          <span className="gv-legend-label">Type Mapping</span>
          {activeTypes.map((type) => (
            <Tag key={type} type={TYPE_TAG_TYPE[type] ?? 'cool-gray'} size="sm">{type}</Tag>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <span className="gv-legend-label">Risk</span>
            <span className="gv-risk-badge gv-risk-high">HIGH</span>
            <span className="gv-risk-badge gv-risk-med">MED</span>
            <span className="gv-risk-badge gv-risk-low">LOW</span>
          </div>
        </div>
      </div>
    </Layer>
  );
};

export default GraphVisualization;