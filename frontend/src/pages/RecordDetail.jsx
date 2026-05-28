import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, X, AlertTriangle, Shield, Play, ArrowRight, FileCode, Edit3, ClipboardList, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/SkeletonLoader';

export default function RecordDetail({ recordId, onBack, addToast, onRecordAction }) {
  const [record, setRecord] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit form states
  const [isEditing, setIsEditing] = useState(false);
  const [formAmount, setFormAmount] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formDate, setFormDate] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Action states
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [flagNotes, setFlagNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [approveAnimated, setApproveAnimated] = useState(false);

  // View modes
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);

  const fetchRecordData = async () => {
    setLoading(true);
    try {
      // FIX: Use api.getRecord(id) to fetch the specific record directly
      const match = await api.getRecord(recordId);
      setRecord(match);

      // Fetch audit logs for this specific record
      const logs = await api.getAuditLogs({ record: recordId });
      setAuditLogs(logs.results || logs);

      // Populate edit form
      if (match) {
        setFormAmount(match.amount);
        setFormUnit(match.unit);
        setFormDate(match.activity_date);
      }
    } catch (err) {
      addToast('Error', 'Failed to retrieve record detail.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recordId) {
      fetchRecordData();
    }
  }, [recordId]);

  // Syntax highlighting for JSON Terminal
  const renderJSONTerminal = (jsonObj) => {
    if (!jsonObj) return null;
    const jsonStr = JSON.stringify(jsonObj, null, 2);
    const lines = jsonStr.split('\n');
    
    return lines.map((line, idx) => {
      const match = line.match(/^(\s*)"([^"]+)":\s*(.*)$/);
      if (match) {
        const indent = match[1];
        const key = match[2];
        const val = match[3];
        
        let valSpan = <span className="text-gray-300">{val}</span>;
        if (val.startsWith('"')) {
          valSpan = <span className="text-carbon-approved">"{val.replace(/^"|"$/g, '')}"</span>;
        } else if (!isNaN(val.replace(/,$/, ''))) {
          valSpan = <span className="text-carbon-accent font-mono">{val}</span>;
        } else if (val.startsWith('true') || val.startsWith('false')) {
          valSpan = <span className="text-blue-400 font-semibold">{val}</span>;
        }
        
        return (
          <div key={idx} className="font-mono text-xs leading-relaxed">
            <span>{indent}</span>
            <span className="text-cyan-400">"{key}"</span>
            <span className="text-gray-500">: </span>
            {valSpan}
          </div>
        );
      }
      
      return (
        <div key={idx} className="font-mono text-xs text-gray-500 leading-relaxed">
          {line}
        </div>
      );
    });
  };

  // Actions
  const handleApprove = async () => {
    setActionLoading(true);
    setApproveAnimated(true);
    
    setTimeout(async () => {
      try {
        await api.approveRecord(record.id, approveNotes || 'Approved during auditor review.');
        addToast('Approved', 'Emission record locked and added to ledger.', 'success');
        setApproveNotes('');
        setApproveAnimated(false);
        if (onRecordAction) onRecordAction();
        fetchRecordData();
      } catch (err) {
        addToast('Approval Failed', err.message, 'error');
        setApproveAnimated(false);
      } finally {
        setActionLoading(false);
      }
    }, 900);
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectNotes) {
      addToast('Notes Required', 'Please provide a reason for rejecting the record.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      await api.rejectRecord(record.id, rejectNotes);
      addToast('Rejected', 'Emission record rejected.', 'error');
      setShowRejectModal(false);
      setRejectNotes('');
      if (onRecordAction) onRecordAction();
      fetchRecordData();
    } catch (err) {
      addToast('Rejection Failed', err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFlag = async (e) => {
    e.preventDefault();
    if (!flagNotes) {
      addToast('Notes Required', 'Please explain why this record is flagged.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      await api.updateRecord(record.id, { status: 'FLAGGED' }, flagNotes);
      addToast('Record Flagged', 'Record status set to FLAGGED for investigation.', 'warning');
      setShowFlagModal(false);
      setFlagNotes('');
      fetchRecordData();
    } catch (err) {
      addToast('Flagging Failed', err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!editReason) {
      addToast('Reason Required', 'Please state the reason for these edits.', 'warning');
      return;
    }
    setEditLoading(true);
    try {
      await api.updateRecord(record.id, {
        amount: formAmount,
        unit: formUnit,
        activity_date: formDate
      }, editReason);
      
      addToast('Record Saved', 'Updates saved and carbon footprint recalculated.', 'success');
      setIsEditing(false);
      setEditReason('');
      fetchRecordData();
    } catch (err) {
      addToast('Edit Failed', err.message, 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const getCalculationFlowData = () => {
    if (!record) return null;
    
    let factorName = '';
    let factorVal = '0.00';
    let factorUnit = '';
    
    if (record.source_type === 'SAP') {
      const desc = (record.raw_data.BKTXT || '').toUpperCase();
      if (desc.includes('DIESEL') || desc.includes('DIES') || desc.includes('HEATING')) {
        factorName = 'Diesel Factor (Scope 1)';
        factorVal = '2.68';
        factorUnit = 'kg CO2e/L';
      } else {
        factorName = 'Petrol Factor (Scope 1)';
        factorVal = '2.31';
        factorUnit = 'kg CO2e/L';
      }
    } else if (record.source_type === 'UTILITY') {
      factorName = 'India Grid Factor (Scope 2)';
      factorVal = '0.82';
      factorUnit = 'kg CO2e/kWh';
    } else if (record.source_type === 'TRAVEL') {
      const exp = (record.raw_data.expense_type || '').toUpperCase();
      if (exp === 'AIRFARE') {
        const amt = parseFloat(record.amount);
        factorName = amt < 1500 ? 'Flight Short-Haul (Scope 3)' : 'Flight Long-Haul (Scope 3)';
        factorVal = amt < 1500 ? '0.255' : '0.195';
        factorUnit = 'kg CO2e/km';
      } else if (exp === 'HOTEL') {
        factorName = 'Hotel Room factor (Scope 3)';
        factorVal = '31.2';
        factorUnit = 'kg CO2e/night';
      } else if (exp === 'CAR') {
        factorName = 'Rental Car factor (Scope 3)';
        factorVal = '0.192';
        factorUnit = 'kg CO2e/km';
      } else {
        factorName = 'Rail factor (Scope 3)';
        factorVal = '0.041';
        factorUnit = 'kg CO2e/km';
      }
    }
    
    return { factorName, factorVal, factorUnit };
  };

  const flowData = getCalculationFlowData();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 skeleton-loader rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-12 glass-panel rounded-2xl border border-carbon-border">
        <AlertTriangle className="w-12 h-12 text-carbon-rejected mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white">Record Not Found</h3>
        <p className="text-xs text-gray-500 mt-1">The requested emission record could not be loaded.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 rounded bg-carbon-base text-white text-xs font-semibold">Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Verification Ledger
        </button>
        <div className="flex gap-2">
          {record.status !== 'APPROVED' && (
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="px-3.5 py-2 rounded-lg bg-carbon-base/40 border border-carbon-border hover:border-carbon-accent text-xs font-semibold text-white transition-all flex items-center gap-1.5"
            >
              <Edit3 className="w-4 h-4" />
              {isEditing ? 'Cancel Edits' : 'Modify Record'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-carbon-border relative">
            <div className={`absolute top-4 right-4 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border ${
              record.status === 'APPROVED' ? 'text-carbon-approved border-carbon-approved/30 bg-carbon-approved/5' :
              record.status === 'FLAGGED' ? 'text-carbon-flagged border-carbon-flagged/30 bg-carbon-flagged/5 shadow-neon-amber' :
              record.status === 'REJECTED' ? 'text-carbon-rejected border-carbon-rejected/30 bg-carbon-rejected/5' :
              'text-gray-400 border-gray-600 bg-gray-900/10'
            }`}>
              {record.status}
            </div>

            <h3 className="text-lg font-bold font-display text-white mb-6">Auditor Record Workspace</h3>

            {isEditing ? (
              <form onSubmit={handleSaveChanges} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Activity Amount</label>
                  <input 
                    type="number" step="0.0001" value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full bg-carbon-bg border border-carbon-border text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-carbon-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Unit</label>
                  <input 
                    type="text" value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full bg-carbon-bg border border-carbon-border text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-carbon-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Activity Date</label>
                  <input 
                    type="date" value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-carbon-bg border border-carbon-border text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-carbon-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Audit Reason for Change</label>
                  <textarea 
                    value={editReason} onChange={(e) => setEditReason(e.target.value)}
                    className="w-full bg-carbon-bg border border-carbon-border text-white text-xs rounded-lg p-2.5 h-20 focus:outline-none focus:border-carbon-accent resize-none"
                    placeholder="Document modification rationale..." required
                  />
                </div>
                <button type="submit" disabled={editLoading}
                  className="w-full py-2.5 bg-carbon-accent hover:bg-teal-500 text-black font-semibold rounded-lg text-xs shadow-neon-cyan transition-colors">
                  {editLoading ? 'Recalculating...' : 'Apply Modifications'}
                </button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-semibold">Import Channel</span>
                    <span className="text-sm font-bold text-white mt-1 block">{record.source_type}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-semibold">Scope Level</span>
                    <span className="text-sm font-bold text-white mt-1 block">Scope {record.scope}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-semibold">Report Date</span>
                    <span className="text-sm font-mono text-gray-300 mt-1 block">{record.activity_date}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-semibold">Calculated Footprint</span>
                    <span className="text-sm font-bold text-carbon-accent mt-1 block font-mono">
                      {parseFloat(record.normalized_amount_kg_co2e).toFixed(2)} kg CO2e
                    </span>
                  </div>
                </div>

                {record.status === 'FLAGGED' && (
                  <div className="bg-carbon-flagged/10 border border-carbon-flagged/30 p-3 rounded-lg flex items-start gap-2.5 text-xs text-carbon-flagged leading-relaxed">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold mb-1">System Warning Flags</h4>
                      <p>{record.flag_reason}</p>
                    </div>
                  </div>
                )}

                {flowData && (
                  <div className="pt-6 border-t border-carbon-border/50">
                    <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-4">Emissions Calculations Flow</h4>
                    <div className="flex flex-col md:flex-row items-center gap-3 w-full">
                      <div className="glass-panel p-3 rounded-lg border border-carbon-border w-full text-center">
                        <span className="text-[9px] uppercase tracking-wide text-gray-500 font-semibold block">{flowData.factorName}</span>
                        <span className="text-sm font-bold font-mono text-white mt-1 block">{flowData.factorVal}</span>
                        <span className="text-[9px] text-gray-400 block">{flowData.factorUnit}</span>
                      </div>
                      <div className="text-gray-600 font-bold text-xs uppercase flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-carbon-accent hidden md:block" />
                        <span className="md:hidden">Multiply</span>
                      </div>
                      <div className="glass-panel p-3 rounded-lg border border-carbon-border w-full text-center">
                        <span className="text-[9px] uppercase tracking-wide text-gray-500 font-semibold block">Raw Amount</span>
                        <span className="text-sm font-bold font-mono text-white mt-1 block">
                          {parseFloat(record.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[9px] text-gray-400 block uppercase">{record.unit}</span>
                      </div>
                      <div className="text-gray-600 font-bold text-xs uppercase flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-carbon-accent hidden md:block" />
                        <span className="md:hidden">Equals</span>
                      </div>
                      <div className="glass-panel p-3 rounded-lg border border-carbon-approved/30 w-full text-center bg-carbon-approved/5 shadow-neon-green">
                        <span className="text-[9px] uppercase tracking-wide text-carbon-approved font-semibold block">Total Emissions</span>
                        <span className="text-sm font-bold font-mono text-white mt-1 block">
                          {parseFloat(record.normalized_amount_kg_co2e).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </span>
                        <span className="text-[9px] text-gray-400 block">kg CO2e</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {record.status !== 'APPROVED' && !isEditing && (
            <div className="glass-panel p-6 rounded-2xl border border-carbon-border space-y-6">
              <h3 className="text-base font-bold font-display text-white">Auditor Decision Locker</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Audit lock description (Optional)</label>
                  <textarea 
                    value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)}
                    className="w-full bg-carbon-bg border border-carbon-border text-white text-xs rounded-lg p-3 h-20 focus:outline-none focus:border-carbon-accent resize-none"
                    placeholder="Leave validation sign-off comments..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => setShowRejectModal(true)} disabled={actionLoading}
                    className="py-3 rounded-lg bg-carbon-rejected/10 hover:bg-carbon-rejected/20 border border-carbon-rejected/30 text-carbon-rejected text-xs font-semibold transition-colors">
                    Reject
                  </button>
                  <button onClick={() => setShowFlagModal(true)} disabled={actionLoading}
                    className="py-3 rounded-lg bg-carbon-flagged/10 hover:bg-carbon-flagged/20 border border-carbon-flagged/30 text-carbon-flagged text-xs font-semibold transition-colors">
                    Flag
                  </button>
                  <button onClick={handleApprove} disabled={actionLoading}
                    className={`py-3 rounded-lg font-bold text-xs text-white transition-all flex items-center justify-center gap-2 ${
                      approveAnimated ? 'bg-carbon-approved scale-95 shadow-neon-green' : 'bg-carbon-approved hover:bg-emerald-600 shadow-neon-green'
                    }`}>
                    {approveAnimated ? (
                      <CheckCircle className="w-5 h-5 animate-[breath_0.2s_ease-out]" />
                    ) : actionLoading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <><Shield className="w-4 h-4" /> Lock & Approve</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-2xl border border-carbon-border overflow-hidden">
            <div className="bg-carbon-base/30 px-4 py-3 border-b border-carbon-border flex justify-between items-center">
              <span className="text-xs text-white font-semibold flex items-center gap-2">
                <FileCode className="w-4 h-4 text-carbon-accent" />
                Raw Ingested Payload Data
              </span>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold font-mono">JSON Format</span>
            </div>
            <div className="p-4 bg-black/60 font-mono text-[11px] overflow-x-auto max-h-[300px] scrollbar-thin">
              {renderJSONTerminal(record.raw_data)}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-carbon-border space-y-6">
            <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-carbon-accent" />
              Record Modification History
            </h3>
            {auditLogs.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-500">
                No modifications recorded. This record maintains its raw imported values.
              </div>
            ) : (
              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <div key={log.id} className="border-b border-carbon-border/30 pb-4 last:border-b-0 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-white uppercase tracking-wider text-[10px] text-carbon-accent">{log.action}</span>
                      <span className="text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed font-medium">{log.notes}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-semibold">
                      <span>Performed by: {log.performed_by_detail?.username || 'System Ingest'}</span>
                    </div>
                    {log.old_value && log.new_value && (
                      <div className="bg-black/30 p-2 rounded text-[9px] font-mono text-gray-500 space-y-1">
                        <div><span className="text-carbon-rejected">- Old:</span> {JSON.stringify(log.old_value)}</div>
                        <div><span className="text-carbon-approved">+ New:</span> {JSON.stringify(log.new_value)}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleReject} className="w-full max-w-md bg-carbon-card border border-carbon-border p-6 rounded-xl shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-carbon-border/50 pb-3">
              <h3 className="text-base font-bold font-display text-white">Confirm Audit Rejection</h3>
              <button type="button" onClick={() => setShowRejectModal(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <p className="text-xs text-gray-400 leading-relaxed">Rejecting this record removes it from carbon reporting totals.</p>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Reason for rejection</label>
                <textarea value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)}
                  className="w-full bg-carbon-bg border border-carbon-border text-white text-xs rounded-lg p-3 h-24 focus:outline-none focus:border-carbon-accent resize-none"
                  placeholder="e.g., Duplicate document entry..." required />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded border border-carbon-border text-xs font-semibold text-gray-400">Cancel</button>
              <button type="submit" disabled={actionLoading}
                className="px-5 py-2 rounded bg-carbon-rejected hover:bg-red-600 text-xs font-semibold text-white shadow-neon-red">Reject Record</button>
            </div>
          </form>
        </div>
      )}

      {showFlagModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleFlag} className="w-full max-w-md bg-carbon-card border border-carbon-border p-6 rounded-xl shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-carbon-border/50 pb-3">
              <h3 className="text-base font-bold font-display text-white">Flag Record for Audit</h3>
              <button type="button" onClick={() => setShowFlagModal(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <p className="text-xs text-gray-400 leading-relaxed">Flagging marks a record as warning-active for other analysts to review.</p>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Investigation Notes</label>
                <textarea value={flagNotes} onChange={(e) => setFlagNotes(e.target.value)}
                  className="w-full bg-carbon-bg border border-carbon-border text-white text-xs rounded-lg p-3 h-24 focus:outline-none focus:border-carbon-accent resize-none"
                  placeholder="State the discrepancy that needs review..." required />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowFlagModal(false)}
                className="px-4 py-2 rounded border border-carbon-border text-xs font-semibold text-gray-400">Cancel</button>
              <button type="submit" disabled={actionLoading}
                className="px-5 py-2 rounded bg-carbon-flagged hover:bg-amber-600 text-xs font-semibold text-white shadow-neon-amber">Flag Record</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}