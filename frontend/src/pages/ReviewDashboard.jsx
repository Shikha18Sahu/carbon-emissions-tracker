import React, { useState, useEffect } from 'react';
import { Eye, Check, AlertTriangle, X, Edit, SlidersHorizontal, Info, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { CardSkeleton, TableSkeleton, SpeedometerSkeleton } from '../components/SkeletonLoader';

export default function ReviewDashboard({ onViewRecord, addToast, onRecordAction }) {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);

  const [filters, setFilters] = useState({
    source_type: '',
    scope: '',
    status: '',
    date_start: '',
    date_end: '',
  });

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkApproving, setBulkApproving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [editReason, setEditReason] = useState('Inline edit of quantity');

  const fetchSummary = async () => {
    try {
      const data = await api.getSummary();
      setSummary(data);
    } catch (err) {
      addToast('Error', 'Failed to retrieve dashboard stats.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    setRecordsLoading(true);
    try {
      const data = await api.getRecords(filters);
      setRecords(data.results || data);
    } catch (err) {
      addToast('Error', 'Failed to retrieve emission records.', 'error');
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, []);
  useEffect(() => { fetchRecords(); setSelectedIds([]); }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(records.filter(r => r.status !== 'APPROVED').map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, e) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setBulkApproving(true);
    try {
      const res = await api.bulkApprove(selectedIds);
      addToast('Records Approved', res.message, 'success');
      setSelectedIds([]);
      fetchSummary();
      fetchRecords();
      if (onRecordAction) onRecordAction();
    } catch (err) {
      addToast('Bulk Approval Failed', err.message, 'error');
    } finally {
      setBulkApproving(false);
    }
  };

  const handleStartEdit = (record) => {
    if (record.status === 'APPROVED') {
      addToast('Record Locked', 'Approved records cannot be edited.', 'warning');
      return;
    }
    setEditingId(record.id);
    setEditingValue(record.amount);
  };

  const handleSaveEditRequest = (id, fieldName) => {
    if (!editingValue || isNaN(editingValue) || parseFloat(editingValue) <= 0) {
      addToast('Invalid Input', 'Quantity must be a positive number.', 'error');
      setEditingId(null);
      return;
    }
    setPendingUpdate({ id, fieldName, value: editingValue });
    setEditReason('Inline correction of raw activity amount.');
    setReasonModalOpen(true);
  };

  const handleConfirmEdit = async () => {
    if (!pendingUpdate) return;
    setReasonModalOpen(false);
    try {
      await api.updateRecord(pendingUpdate.id, { [pendingUpdate.fieldName]: pendingUpdate.value }, editReason);
      addToast('Record Updated', 'Recalculation complete. Carbon values updated.', 'success');
      setEditingId(null);
      setPendingUpdate(null);
      fetchSummary();
      fetchRecords();
    } catch (err) {
      addToast('Update Failed', err.message, 'error');
    }
  };

  const getSourceLabel = (src) => {
    switch (src) {
      case 'SAP': return 'Scope 1 - Fuel';
      case 'UTILITY': return 'Scope 2 - Grid';
      case 'TRAVEL': return 'Scope 3 - Travel';
      default: return src;
    }
  };

  // FIX: Row border color based on individual record.status
  const getRowStyles = (record) => {
    let classes = 'border-l-4 transition-all duration-200 ';
    switch (record.status) {
      case 'APPROVED':
        classes += 'border-carbon-approved bg-carbon-approved/5 opacity-60';
        break;
      case 'FLAGGED':
        classes += 'border-carbon-flagged bg-carbon-flagged/5 shadow-[0_0_15px_rgba(245,158,11,0.06)]';
        break;
      case 'REJECTED':
        classes += 'border-carbon-rejected bg-carbon-rejected/5';
        break;
      default:
        classes += 'border-gray-500 bg-carbon-card/40';
        break;
    }
    return classes;
  };

  // FIX: Status badge for each row based on individual record.status
  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-carbon-approved/10 text-carbon-approved border border-carbon-approved/30">
            <span className="w-1.5 h-1.5 rounded-full bg-carbon-approved inline-block"></span>
            Approved
          </span>
        );
      case 'FLAGGED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-carbon-flagged/10 text-carbon-flagged border border-carbon-flagged/30">
            <span className="w-1.5 h-1.5 rounded-full bg-carbon-flagged inline-block"></span>
            Flagged
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-carbon-rejected/10 text-carbon-rejected border border-carbon-rejected/30">
            <span className="w-1.5 h-1.5 rounded-full bg-carbon-rejected inline-block"></span>
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-700/40 text-gray-400 border border-gray-600/30">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span>
            Pending
          </span>
        );
    }
  };

  const targetTonnes = 500;
  const currentTonnes = summary ? summary.total_co2e_tonnes : 0;
  const speedometerPercentage = summary ? Math.min((currentTonnes / targetTonnes) * 100, 100) : 0;

  return (
    <div className="space-y-8">
      {/* Summary KPI Block */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { title: 'Total Ingested', val: summary?.total_records ?? 0, sub: 'Total raw data rows' },
            { title: 'Pending Audit', val: summary?.pending_count ?? 0, sub: 'Awaiting lock approval', highlight: (summary?.pending_count ?? 0) > 0 ? 'text-carbon-accent' : '' },
            { title: 'Auto-Flagged', val: summary?.flagged_count ?? 0, sub: 'Needs outlier verification', highlight: (summary?.flagged_count ?? 0) > 0 ? 'text-carbon-flagged' : '' },
            { title: 'Approved Lock', val: summary?.approved_count ?? 0, sub: 'Audited carbon data' },
            { title: 'Total Approved CO2e', val: `${summary?.total_co2e_tonnes ?? 0} t`, sub: 'Metric tonnes CO2e locked', highlight: 'text-carbon-approved font-display' }
          ].map((card, idx) => (
            <div key={idx} className="glass-panel p-5 rounded-xl border border-carbon-border/60 hover:scale-102 hover:shadow-neon-cyan transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-carbon-accent/5 rounded-full blur-2xl pointer-events-none group-hover:bg-carbon-accent/10 transition-colors"></div>
              <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{card.title}</h4>
              <p className={`text-2xl font-bold mt-2 font-display text-white ${card.highlight || ''}`}>{card.val}</p>
              <p className="text-[10px] text-gray-400 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Speedometer & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-carbon-border flex flex-col items-center justify-between text-center relative group">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-carbon-approved/5 to-transparent blur-xl pointer-events-none"></div>
          <div>
            <h3 className="text-base font-bold font-display text-white tracking-wide">Carbon Target Gauge</h3>
            <p className="text-xs text-gray-400 mt-1">Approved locked emissions progress</p>
          </div>
          {loading ? <SpeedometerSkeleton /> : (
            <div className="my-4 flex flex-col items-center">
              <div className="relative w-56 h-28 flex items-center justify-center overflow-hidden">
                <svg className="w-56 h-36 relative" viewBox="0 0 100 50">
                  <path d="M 10,50 A 40,40 0 0,1 90,50" fill="none" stroke="#122014" strokeWidth="8" strokeLinecap="round" />
                  <path d="M 10,50 A 40,40 0 0,1 90,50" fill="none" stroke="url(#speedometerGradient)" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * speedometerPercentage) / 100}
                    className="transition-all duration-1000 ease-out" />
                  <defs>
                    <linearGradient id="speedometerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#1a3a2a" />
                      <stop offset="50%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#00f5d4" />
                    </linearGradient>
                  </defs>
                  <g transform={`rotate(${(speedometerPercentage / 100) * 180 - 90} 50 50)`} className="transition-transform duration-1000 ease-out">
                    <line x1="50" y1="50" x2="50" y2="15" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="50" cy="50" r="4" fill="#00f5d4" />
                  </g>
                </svg>
                <div className="absolute bottom-0 text-center">
                  <span className="text-xl font-bold font-display text-white">{currentTonnes.toFixed(1)}</span>
                  <span className="text-xs text-gray-500 font-semibold block uppercase tracking-wide">Tonnes CO2e</span>
                </div>
              </div>
              <div className="text-[10px] text-gray-400 mt-3 font-semibold uppercase tracking-wider">
                Audited Carbon Progress against {targetTonnes}t target limit
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-carbon-border flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-carbon-accent" />
              Advanced Data Filters
            </h3>
            <p className="text-xs text-gray-400 mt-1">Isolate datasets across scopes, platforms, and date spans.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Ingest Channel</label>
              <select value={filters.source_type} onChange={(e) => handleFilterChange('source_type', e.target.value)}
                className="w-full bg-carbon-bg border border-carbon-border text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-carbon-accent">
                <option value="">All Channels (SAP/Utility/Travel)</option>
                <option value="SAP">SAP Flat File (Fuel)</option>
                <option value="UTILITY">Utility CSV (Electricity)</option>
                <option value="TRAVEL">Corporate Travel CSV</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Audit Scope</label>
              <select value={filters.scope} onChange={(e) => handleFilterChange('scope', e.target.value)}
                className="w-full bg-carbon-bg border border-carbon-border text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-carbon-accent">
                <option value="">All Scopes (1, 2, 3)</option>
                <option value="1">Scope 1 - Direct Combustion</option>
                <option value="2">Scope 2 - Grid Purchases</option>
                <option value="3">Scope 3 - Indirect Travel</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Review Status</label>
              <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full bg-carbon-bg border border-carbon-border text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-carbon-accent">
                <option value="">All Statuses</option>
                <option value="PENDING">Pending Review</option>
                <option value="FLAGGED">Auto-Flagged Warnings</option>
                <option value="APPROVED">Approved Lock</option>
                <option value="REJECTED">Rejected Audit</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Ingest Start</label>
              <input type="date" value={filters.date_start} onChange={(e) => handleFilterChange('date_start', e.target.value)}
                className="w-full bg-carbon-bg border border-carbon-border text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-carbon-accent" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Ingest End</label>
              <input type="date" value={filters.date_end} onChange={(e) => handleFilterChange('date_end', e.target.value)}
                className="w-full bg-carbon-bg border border-carbon-border text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-carbon-accent" />
            </div>
            <div className="flex items-end">
              <button onClick={() => setFilters({ source_type: '', scope: '', status: '', date_start: '', date_end: '' })}
                className="w-full bg-carbon-base/40 hover:bg-carbon-base/60 border border-carbon-border text-white text-xs rounded-lg py-2.5 transition-colors">
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="glass-panel p-6 rounded-2xl border border-carbon-border relative">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-base font-bold font-display text-white">Verification Ledger</h3>
          <span className="text-xs text-gray-500 font-semibold">{records.length} records matching filter</span>
        </div>

        {recordsLoading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : records.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Info className="w-10 h-10 text-gray-600 mx-auto" />
            <h4 className="text-gray-400 font-medium text-sm">No ledger records found</h4>
            <p className="text-xs text-gray-600">No imported entries match the selected filter configuration.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-carbon-border text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-3 w-10">
                    <input type="checkbox" onChange={handleSelectAll}
                      checked={selectedIds.length > 0 && selectedIds.length === records.filter(r => r.status !== 'APPROVED').length}
                      className="rounded bg-carbon-bg border-carbon-border text-carbon-accent focus:ring-0" />
                  </th>
                  <th className="py-3 px-4">Channel (Scope)</th>
                  <th className="py-3 px-4">Activity Date</th>
                  <th className="py-3 px-4">Raw Quantity</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Carbon (kg CO2e)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Flag Details</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-carbon-border/30 text-xs">
                {records.map((record) => {
                  const isSelected = selectedIds.includes(record.id);
                  const isEditingRow = editingId === record.id;

                  return (
                    <tr key={record.id} className={`hover:bg-carbon-base/5 transition-all duration-150 ${getRowStyles(record)}`}>
                      <td className="py-4 px-3 align-middle">
                        {record.status !== 'APPROVED' ? (
                          <input type="checkbox" checked={isSelected}
                            onChange={(e) => handleSelectOne(record.id, e)}
                            className="rounded bg-carbon-bg border-carbon-border text-carbon-accent focus:ring-0" />
                        ) : (
                          <span className="block w-2.5 h-2.5 rounded-full bg-carbon-approved/30 mx-auto"></span>
                        )}
                      </td>

                      <td className="py-4 px-4 align-middle">
                        <span className="font-bold text-white block">{record.source_type}</span>
                        <span className="text-[10px] text-gray-400 block">{getSourceLabel(record.source_type)}</span>
                      </td>

                      <td className="py-4 px-4 align-middle text-gray-400 font-mono">{record.activity_date}</td>

                      <td className="py-4 px-4 align-middle font-semibold font-mono text-white cursor-pointer group"
                        onDoubleClick={() => handleStartEdit(record)}>
                        {isEditingRow ? (
                          <input type="text" value={editingValue} onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleSaveEditRequest(record.id, 'amount')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditRequest(record.id, 'amount');
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="bg-carbon-bg border border-carbon-accent text-white px-2 py-1 rounded w-20 text-xs text-center focus:outline-none"
                            autoFocus />
                        ) : (
                          <span className="flex items-center gap-1 hover:text-carbon-accent">
                            {parseFloat(record.amount).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                            {record.status !== 'APPROVED' && (
                              <Edit className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 align-middle font-semibold text-gray-400 uppercase">{record.unit}</td>

                      <td className="py-4 px-4 align-middle font-bold text-white font-mono">
                        {parseFloat(record.normalized_amount_kg_co2e).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>

                      {/* FIX: Each row shows its own status badge */}
                      <td className="py-4 px-4 align-middle">
                        {getStatusBadge(record.status)}
                      </td>

                      <td className="py-4 px-4 align-middle text-carbon-flagged font-medium max-w-[180px] truncate">
                        {record.status === 'FLAGGED' ? (
                          <span className="flex items-center gap-1 text-[10px]">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            {record.flag_reason}
                          </span>
                        ) : record.status === 'REJECTED' ? (
                          <span className="text-carbon-rejected text-[10px]">Rejected</span>
                        ) : record.status === 'APPROVED' ? (
                          <span className="text-carbon-approved text-[10px]">Audit Locked</span>
                        ) : (
                          <span className="text-gray-500 text-[10px]">Verify Clear</span>
                        )}
                      </td>

                      <td className="py-4 px-4 align-middle text-right">
                        <button onClick={() => onViewRecord(record.id)}
                          className="px-3 py-1.5 rounded bg-carbon-base/40 border border-carbon-border hover:border-carbon-accent text-[11px] font-semibold text-white transition-all flex items-center gap-1.5 inline-flex">
                          <Eye className="w-3.5 h-3.5" />
                          Auditor Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Approve Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-carbon-card border border-carbon-accent p-4 rounded-xl flex items-center gap-6 shadow-2xl w-full max-w-lg">
          <div className="flex-grow">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Bulk Approval Active</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">{selectedIds.length} records selected for audit locking.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded border border-carbon-border text-xs font-semibold text-gray-400 transition-colors">
              Cancel
            </button>
            <button onClick={handleBulkApprove} disabled={bulkApproving}
              className="px-4 py-1.5 rounded bg-carbon-approved hover:bg-emerald-600 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 shadow-neon-green">
              {bulkApproving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <><Check className="w-4 h-4" /> Approve Selected</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Edit Reason Modal */}
      {reasonModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-carbon-card border border-carbon-border p-6 rounded-xl shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-carbon-border/50 pb-3">
              <h3 className="text-base font-bold font-display text-white">Mandatory Edit Tracking</h3>
              <button onClick={() => { setReasonModalOpen(false); setEditingId(null); }} className="text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-carbon-accent/5 border border-carbon-accent/20 rounded p-3 text-xs text-carbon-accent leading-relaxed">
                Auditors require a documented rationale for inline record updates.
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">Reason for modification</label>
                <textarea value={editReason} onChange={(e) => setEditReason(e.target.value)}
                  className="w-full bg-carbon-bg border border-carbon-border text-white text-xs rounded-lg p-3 h-24 focus:outline-none focus:border-carbon-accent resize-none"
                  placeholder="Provide audit notes rationale..." required />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setReasonModalOpen(false); setEditingId(null); }}
                className="px-4 py-2 rounded border border-carbon-border text-xs font-semibold text-gray-400">Discard Change</button>
              <button onClick={handleConfirmEdit}
                className="px-5 py-2 rounded bg-carbon-accent hover:bg-teal-500 text-xs font-semibold text-black shadow-neon-cyan">
                Save & Recalculate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}