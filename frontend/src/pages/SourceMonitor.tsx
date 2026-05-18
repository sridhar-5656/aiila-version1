import React, { useEffect, useState } from 'react';
import client from '../api/client';

// 1. Types mapped strictly to Backend "SourceOut" Pydantic model
interface Source {
  id: string;
  name: string;
  source_type: string; 
  status: string;      // "active" | "error" (calculated by backend _status function)
  last_crawl_time: string | null;
  events_today: number;
  tier: number;
  reliability_badge: string;
  url: string | null;
  is_active: boolean;
  error_message: string | null;
}

const statusColors: Record<string, string> = {
  active: 'text-green-400 bg-green-900/30 border-green-800',
  error: 'text-red-400 bg-red-900/30 border-red-800',
  inactive: 'text-slate-400 bg-slate-800 border-slate-700',
};

const tierStyles: Record<number, string> = {
  1: 'bg-blue-900/40 text-blue-300 border-blue-700',
  2: 'bg-cyan-900/40 text-cyan-300 border-cyan-700',
  3: 'bg-purple-900/40 text-purple-300 border-purple-700',
};

const SourceMonitor: React.FC = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = async () => {
    try {
      const response = await client.get('/sources');

      console.log('API Response:', response.data);

      if (Array.isArray(response.data)) {
        setSources(response.data);
      } else if (response.data && Array.isArray(response.data.items)) {
        setSources(response.data.items);
      } else {
        setSources([]);
        setError('Invalid API response format');
      }

      setError(null);
    } catch (err: unknown) {
      console.error('Fetch Error:', err);
      setError('System failure: Unable to sync with source controller. Check if Backend is running on port 8000.');
      setSources([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
    const interval = setInterval(fetchSources, 30000); 
    return () => clearInterval(interval);
  }, []);

  const toggleSource = async (source: Source) => {
    // Note: Backend might need a PATCH /sources/{id} endpoint to handle is_active
    const targetState = !source.is_active;
    try {
      await client.patch(`/sources/${source.id}`, { is_active: targetState });
      // Optimistic update
      setSources((prev) =>
        prev.map((s) => (s.id === source.id ? { ...s, is_active: targetState, status: targetState ? 'active' : 'inactive' } : s))
      );
    } catch (err) {
      alert('Action Denied: Administrator role required to modify source state.');
    }
  };

  return (
    <div className="p-8 bg-[#0D0F14] min-h-screen font-sans text-slate-200">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-end border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Source Monitor</h1>
            <p className="text-slate-500 text-sm mt-1">Registry of configured OSINT collectors and ingestion health</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
              Live Sync: {isLoading ? 'Polling...' : 'Connected'}
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800 p-4 rounded-lg text-red-400 text-sm font-mono">
             [ERROR]: {error}
          </div>
        )}

        {isLoading && sources.length === 0 ? (
          <div className="flex items-center gap-3 text-slate-500 font-mono text-sm animate-pulse">
            <div className="w-4 h-4 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin" />
            ESTABLISHING HANDSHAKE WITH REGISTRY...
          </div>
        ) : (
          <div className="overflow-hidden border border-slate-800 rounded-xl bg-slate-900/10 backdrop-blur-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-800">
                  <th className="p-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Resource Name / URL</th>
                  <th className="p-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Health Status</th>
                  <th className="p-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider text-center">Trust Tier</th>
                  <th className="p-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider text-right">Events (24h)</th>
                  <th className="p-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Last Crawl</th>
                  <th className="p-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider text-right">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sources.map((source) => (
                  <tr key={source.id} className="hover:bg-slate-800/40 transition-all duration-200">
                    <td className="p-4">
                      <div className="font-semibold text-slate-100 text-sm">{source.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-1 truncate max-w-[240px]">
                        {source.url || 'Internal Data Stream'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border ${statusColors[source.status] || statusColors.inactive}`}>
                          {source.status}
                        </span>
                        {source.error_message && (
                          <span className="text-[10px] text-red-500 font-mono italic max-w-[180px] truncate">
                            ! {source.error_message}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div 
                        title={source.reliability_badge}
                        className={`inline-block px-3 py-1 rounded text-[10px] font-bold border cursor-help shadow-sm ${tierStyles[source.tier] || tierStyles[2]}`}
                      >
                        TIER {source.tier}
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono text-sm text-slate-300">
                      {source.events_today.toLocaleString()}
                    </td>
                    <td className="p-4 text-[11px] text-slate-500 font-mono">
                      {source.last_crawl_time 
                        ? new Date(source.last_crawl_time).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' }) 
                        : 'PENDING'}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => toggleSource(source)}
                        className={`px-4 py-1.5 rounded text-[10px] font-bold tracking-widest transition-all active:scale-95 ${
                          source.is_active
                            ? 'text-red-400 border border-red-900/50 hover:bg-red-400/10'
                            : 'text-green-400 border border-green-900/50 hover:bg-green-400/10'
                        }`}
                      >
                        {source.is_active ? 'TERMINATE' : 'INITIALIZE'}
                      </button>
                    </td>
                  </tr>
                ))}
                {sources.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-slate-600 font-mono text-xs uppercase tracking-[0.2em]">
                      Registry is empty. No data collectors configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SourceMonitor;