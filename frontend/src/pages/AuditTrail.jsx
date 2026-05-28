import React, { useState, useEffect } from 'react';
import { Cloud, Shield, Pencil, XCircle, Search, Info, SlidersHorizontal, ArrowRight, User } from 'lucide-react';
import { api } from '../services/api';
import { TimelineSkeleton } from '../components/SkeletonLoader';

export default function AuditTrail({ addToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  // Filters State
  const [filters, setFilters] = useState({
    action: '',
    user_id: '',
  });

  const fetchUsers = async () => {
    try {
      const data = await api.getClients();
      // For simplicity, we can fetch all users from a separate endpoint.
      // But since we can fetch records and extract users or use a standard helper, 
      // let's define that users are fetched, or standard users are listed (admin).
      // Since it's a prototype, we can show standard admin. We can query records/audit logs to see who performed what.
      // Let's query log lists and compile a unique list of actors.
      const logData = await api.getAuditLogs();
      const allLogs = logData.results || logData;
      const uniqueUsers = [];
      const userMap = {};
      
      allLogs.forEach(l => {
        if (l.performed_by_detail && !userMap[l.performed_by_detail.id]) {
          userMap[l.performed_by_detail.id] = true;
          uniqueUsers.push(l.performed_by_detail);
        }
      });
      setUsers(uniqueUsers);
    } catch (err) {
      // Gracefully handle
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs(filters);
      setLogs(data.results || data);
    } catch (err) {
      addToast('Error', 'Failed to retrieve audit log.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Relative Time Formatter
  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    
    // Fallback if client clock is out of sync or time is in future
    if (diffMs < 0) return 'just now';
    
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return 'yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getActionIcon = (actionType) => {
    const baseClass = "w-5 h-5 ";
    switch (actionType) {
      case 'UPLOAD':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Cloud className={baseClass} />
          </div>
        );
      case 'APPROVE':
        return (
          <div className="w-10 h-10 rounded-full bg-carbon-approved/10 border border-carbon-approved/30 flex items-center justify-center text-carbon-approved">
            <Shield className={baseClass} />
          </div>
        );
      case 'EDIT':
        return (
          <div className="w-10 h-10 rounded-full bg-carbon-accent/10 border border-carbon-accent/30 flex items-center justify-center text-carbon-accent">
            <Pencil className={baseClass} />
          </div>
        );
      case 'REJECT':
        return (
          <div className="w-10 h-10 rounded-full bg-carbon-rejected/10 border border-carbon-rejected/30 flex items-center justify-center text-carbon-rejected">
            <XCircle className={baseClass} />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gray-500/10 border border-gray-500/30 flex items-center justify-center text-gray-400">
            <Info className={baseClass} />
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold font-display text-white">Immutable Audit Trail</h2>
        <p className="text-gray-400 text-sm mt-1">Immutable ledger tracking all database actions, auditor sign-offs, and data overrides.</p>
      </div>

      {/* Filters Toolbar */}
      <div className="glass-panel p-5 rounded-2xl border border-carbon-border flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold self-start md:self-center">
          <SlidersHorizontal className="w-4 h-4 text-carbon-accent" />
          Filter Trail Logs
        </div>

        <div className="grid grid-cols-2 md:flex gap-4 w-full md:w-auto">
          <select 
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            className="bg-carbon-bg border border-carbon-border text-white text-xs rounded-lg p-2.5 min-w-[150px] focus:outline-none focus:border-carbon-accent"
          >
            <option value="">All Actions</option>
            <option value="UPLOAD">UPLOAD</option>
            <option value="APPROVE">APPROVE</option>
            <option value="REJECT">REJECT</option>
            <option value="EDIT">EDIT</option>
          </select>

          <select 
            value={filters.user_id}
            onChange={(e) => handleFilterChange('user_id', e.target.value)}
            className="bg-carbon-bg border border-carbon-border text-white text-xs rounded-lg p-2.5 min-w-[150px] focus:outline-none focus:border-carbon-accent"
          >
            <option value="">All Users</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>

          <button 
            onClick={() => setFilters({ action: '', user_id: '' })}
            className="bg-carbon-base/40 border border-carbon-border hover:border-carbon-accent text-white text-xs rounded-lg px-4 py-2.5 transition-colors col-span-2 md:col-span-1"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Timeline view */}
      {loading ? (
        <TimelineSkeleton />
      ) : logs.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-carbon-border space-y-3">
          <Info className="w-10 h-10 text-gray-600 mx-auto" />
          <h4 className="text-gray-400 font-medium text-sm">No audit logs found</h4>
          <p className="text-xs text-gray-600">The current filters returned zero timeline entries.</p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-8 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[1px] before:bg-carbon-border/60">
          {logs.map((log) => (
            <div key={log.id} className="relative flex gap-6 items-start group">
              
              {/* Action Circle Icon */}
              <div className="absolute -left-[20px] transition-transform duration-200 group-hover:scale-105">
                {getActionIcon(log.action)}
              </div>

              {/* Event card details */}
              <div className="glass-panel p-5 rounded-xl border border-carbon-border/50 bg-carbon-card/45 hover:border-carbon-accent/30 transition-all duration-200 flex-grow ml-6 relative group overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-carbon-accent/2 rounded-full blur-xl pointer-events-none"></div>
                
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-carbon-accent font-display">
                      {log.action}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1 leading-relaxed">{log.notes}</h4>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] font-semibold text-gray-500 font-mono block">
                      {formatRelativeTime(log.timestamp)}
                    </span>
                    <span className="text-[9px] text-gray-600 mt-1 block">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {log.old_value && log.new_value && (
                  <div className="mt-4 bg-black/40 p-3 rounded-lg border border-carbon-border/30 font-mono text-[10px] text-gray-400 space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-carbon-rejected font-semibold">- Deletions:</span>
                      <span className="text-gray-300">{JSON.stringify(log.old_value)}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-carbon-approved font-semibold">+ Additions:</span>
                      <span className="text-gray-300">{JSON.stringify(log.new_value)}</span>
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                  <User className="w-3 h-3 text-carbon-accent" />
                  <span>Actor: {log.performed_by_detail?.username || 'System Ingest'} ({log.performed_by_detail?.email || 'automated'})</span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
