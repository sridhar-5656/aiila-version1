import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Button, ContentSwitcher, Switch, InlineLoading, InlineNotification, Layer, Tag, TextArea } from '@carbon/react';
import { Download, Save, Development, ConnectTarget } from '@carbon/icons-react';
import { gsap } from 'gsap';
import GraphVisualization from '../components/GraphVisualization';

// ─── Constants & Meta ────────────────────────────────────────────────────────

const SEVERITY_META: any = {
  low: { label: 'LOW', color: '#42be65', bg: 'rgba(66,190,101,0.12)' },
  medium: { label: 'MED', color: '#f1c21b', bg: 'rgba(241,194,27,0.12)' },
  high: { label: 'HIGH', color: '#ff832b', bg: 'rgba(255,131,43,0.12)' },
  critical: { label: 'CRIT', color: '#fa4d56', bg: 'rgba(250,77,86,0.12)' },
};

const ALIAS_TYPE_MAP: Record<string, string> = {
  'phone': '📞 PHONE',
  'email': '✉ EMAIL',
  'upi': '₹ UPI ID',
  'pan': '🪪 PAN',
  'aadhaar': '🔢 [Aadhaar Redacted]', // Redacted per privacy protocol
  'ip': '🌐 IP ADDR'
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

const RiskGauge: React.FC<{ score: number }> = ({ score }) => {
  const [val, setVal] = useState(0);
  useEffect(() => { setVal(score); }, [score]);

  const color = score >= 75 ? '#fa4d56' : score >= 50 ? '#ff832b' : '#42be65';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '32px', fontWeight: 700, color, fontFamily: 'IBM Plex Mono' }}>{val}</div>
      <div style={{ fontSize: '10px', color: '#6f6f6f', letterSpacing: '1px' }}>RISK SCORE</div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const EntityProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [entity, setEntity] = useState<any>({});
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // 1. Wire API Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [entRes, timeRes] = await Promise.all([
          fetch(`/api/v1/entities/${id}`),
          fetch(`/api/v1/entities/${id}/timeline`),
        ]);

        if (!entRes.ok || !timeRes.ok) {
          throw new Error('API request failed');
        }

        const entData = await entRes.json();
        const timeData = await timeRes.json();

        setEntity(entData || {});
        setTimeline(Array.isArray(timeData?.items) ? timeData.items : []);
        setNote(entData?.investigation_notes || '');

        gsap.from('.profile-section', {
          opacity: 0,
          y: 20,
          stagger: 0.1,
          duration: 0.6,
        });
      } catch (err) {
        console.error('Fetch error:', err);
        setEntity({});
        setTimeline([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // 2. Real-time Risk Update Simulation (WebSocket Placeholder)
  useEffect(() => {
    // This simulates a WebSocket subscription to real-time risk updates
    const interval = setInterval(() => {
      setEntity((prev: any) => prev ? { ...prev, risk_score: Math.min(100, prev.risk_score + (Math.random() > 0.8 ? 1 : 0)) } : null);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // 3. Export Evidence
  const handleExport = async () => {
    try {
      const res = await fetch(`/api/v1/evidence`, { method: 'POST', body: JSON.stringify({ entity_id: id }) });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Evidence_${id}.pdf`;
      a.click();
    } catch (e) { alert("Export failed"); }
  };

  // 4. Save Investigation Note
  const saveNote = async () => {
    setSavingNote(true);
    try {
      await fetch(`/api/v1/entities/${id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investigation_notes: note })
      });
    } finally { setSavingNote(false); }
  };

  if (loading) return <InlineLoading description="Syncing Intelligence..." style={{ padding: '40px' }} />;

  return (
    <div style={{ background: '#161616', minHeight: '100vh', color: '#f4f4f4', padding: '24px' }}>
      
      {/* Header Section */}
      <div className="profile-section" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid #393939', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 600 }}>{entity.display_name || entity.primary_identifier}</h1>
          <p style={{ color: '#6f6f6f', fontFamily: 'IBM Plex Mono', fontSize: '12px' }}>ENTITY_ID: {entity.id}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <RiskGauge score={entity.risk_score} />
          <Button kind="tertiary" renderIcon={Download} onClick={handleExport}>Export Evidence</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Graph Visualization */}
          <div className="profile-section" style={{ background: '#262626', padding: '16px', border: '1px solid #393939' }}>
            <h4 style={{ marginBottom: '16px', fontSize: '12px', color: '#8d8d8d' }}>RELATIONSHIP NETWORK</h4>
            <GraphVisualization entityId={id!} height={400} />
          </div>

          {/* Timeline */}
          <div className="profile-section" style={{ background: '#262626', padding: '16px', border: '1px solid #393939' }}>
            <h4 style={{ marginBottom: '16px', fontSize: '12px', color: '#8d8d8d' }}>SOURCE TIMELINE</h4>
            {Array.isArray(timeline) && timeline.map((event, i) => (
              <div key={i} style={{ padding: '12px', borderLeft: `2px solid ${SEVERITY_META.medium.color}`, marginBottom: '8px', background: '#161616' }}>
                <div style={{ fontSize: '11px', color: '#8d8d8d' }}>{new Date(event.timestamp).toLocaleString()} | {event.platform}</div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>{event.content}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Risk Score History Sparkline Placeholder */}
          <div className="profile-section" style={{ background: '#262626', padding: '16px', border: '1px solid #393939' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '12px', color: '#8d8d8d' }}>RISK HISTORY</h4>
            <div style={{ height: '40px', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
              {[40, 45, 42, 50, 65, 76, 70, 82].map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, background: '#fa4d56', opacity: 0.5 + (i * 0.05) }} />
              ))}
            </div>
          </div>

          {/* Aliases */}
          <div className="profile-section" style={{ background: '#262626', padding: '16px', border: '1px solid #393939' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '12px', color: '#8d8d8d' }}>VERIFIED ALIASES</h4>
            {Array.isArray(entity?.aliases) && entity.aliases.map((alias: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #393939' }}>
                <span style={{ fontSize: '12px' }}>{ALIAS_TYPE_MAP[alias.alias_type] || alias.alias_type}</span>
                <span style={{ fontSize: '12px', color: '#c6c6c6' }}>{alias.alias_value}</span>
              </div>
            ))}
          </div>

          {/* Investigation Notes */}
          <div className="profile-section" style={{ background: '#262626', padding: '16px', border: '1px solid #393939' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '12px', color: '#8d8d8d' }}>INVESTIGATION NOTES</h4>
            <TextArea
              labelText=""
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add findings to PostgreSQL record..."
              rows={6}
            />
            <Button 
              size="sm" 
              kind="ghost" 
              renderIcon={Save} 
              onClick={saveNote} 
              style={{ marginTop: '12px', width: '100%' }}
            >
              {savingNote ? 'Persisting...' : 'Save to Record'}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EntityProfilePage;