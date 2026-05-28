import React, { useState, useEffect } from 'react';
import { Upload, Factory, Zap, Plane, FileText, CheckCircle, AlertTriangle, XCircle, Info, Clock, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { TableSkeleton } from '../components/SkeletonLoader';

export default function UploadCenter({ addToast }) {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Upload status states for each pipeline
  const [progress, setProgress] = useState({ SAP: null, UTILITY: null, TRAVEL: null });
  const [dragActive, setDragActive] = useState({ SAP: false, UTILITY: false, TRAVEL: false });
  
  // Drawer state for viewing errors
  const [selectedUpload, setSelectedUpload] = useState(null);

  const fetchUploads = async () => {
    try {
      const data = await api.getUploads();
      setUploads(data.results || data);
    } catch (err) {
      addToast('Error', 'Failed to retrieve upload history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  const handleDrag = (type, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(prev => ({ ...prev, [type]: true }));
    } else if (e.type === "dragleave") {
      setDragActive(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleDrop = async (type, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [type]: false }));
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleUpload(type, e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (type, e) => {
    if (e.target.files && e.target.files[0]) {
      await handleUpload(type, e.target.files[0]);
    }
  };

  const handleUpload = async (type, file) => {
    // Validate file extensions
    const ext = file.name.split('.').pop().toLowerCase();
    if (type === 'SAP' && ext !== 'txt') {
      addToast('Invalid File', 'SAP flat file must be a tab-separated .txt file.', 'error');
      return;
    }
    if ((type === 'UTILITY' || type === 'TRAVEL') && ext !== 'csv') {
      addToast('Invalid File', `${type} upload must be a comma-separated .csv file.`, 'error');
      return;
    }

    setProgress(prev => ({ ...prev, [type]: 10 }));
    
    // Animate circular progress ring mock-up up to 90%
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev[type] >= 90) {
          clearInterval(interval);
          return prev;
        }
        return { ...prev, [type]: prev[type] + 15 };
      });
    }, 150);

    try {
      const response = await api.uploadFile(type, file);
      clearInterval(interval);
      setProgress(prev => ({ ...prev, [type]: 100 }));
      
      setTimeout(() => {
        setProgress(prev => ({ ...prev, [type]: null }));
        addToast(
          'Upload Complete',
          `Parsed ${response.row_count} rows from ${file.name}. Errors: ${response.error_count}`,
          response.error_count > 0 ? 'warning' : 'success'
        );
        fetchUploads();
      }, 500);

    } catch (err) {
      clearInterval(interval);
      setProgress(prev => ({ ...prev, [type]: null }));
      addToast('Upload Failed', err.message || 'File ingestion parser encounted an error.', 'error');
    }
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case 'SAP':
        return <Factory className="w-5 h-5 text-gray-400" />;
      case 'UTILITY':
        return <Zap className="w-5 h-5 text-gray-400" />;
      case 'TRAVEL':
        return <Plane className="w-5 h-5 text-gray-400" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="flex items-center gap-1.5 text-xs text-carbon-approved font-medium">
            <CheckCircle className="w-4 h-4" /> Completed
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center gap-1.5 text-xs text-carbon-rejected font-medium">
            <XCircle className="w-4 h-4" /> Failed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-xs text-carbon-flagged font-medium animate-pulse">
            <Clock className="w-4 h-4" /> Processing
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 relative">
      <div>
        <h2 className="text-2xl font-bold font-display text-white">Ingestion Control Room</h2>
        <p className="text-gray-400 text-sm mt-1">Connect corporate data pipelines directly into the breatheesg calculation engine.</p>
      </div>

      {/* 3 Pipeline Zones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            type: 'SAP',
            title: 'SAP Flat File',
            desc: 'Fuel & Procurement Tab-Separated Ingest (.txt)',
            icon: <Factory className="w-12 h-12 text-carbon-accent" />,
            accept: '.txt'
          },
          {
            type: 'UTILITY',
            title: 'Utility CSV',
            desc: 'Utility Portal Electricity Consumptions (.csv)',
            icon: <Zap className="w-12 h-12 text-carbon-accent" />,
            accept: '.csv'
          },
          {
            type: 'TRAVEL',
            title: 'Corporate Travel CSV',
            desc: 'Concur Travel Expense Ingestion Sheet (.csv)',
            icon: <Plane className="w-12 h-12 text-carbon-accent" />,
            accept: '.csv'
          }
        ].map((pipeline) => {
          const type = pipeline.type;
          const isDragActive = dragActive[type];
          const currentProgress = progress[type];

          return (
            <div 
              key={type}
              onDragEnter={(e) => handleDrag(type, e)}
              onDragOver={(e) => handleDrag(type, e)}
              onDragLeave={(e) => handleDrag(type, e)}
              onDrop={(e) => handleDrop(type, e)}
              className={`group relative glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-center border transition-all duration-300 min-h-[300px] cursor-pointer overflow-hidden ${
                isDragActive ? 'border-carbon-accent bg-carbon-base/10 scale-102' : 'border-carbon-border hover:border-carbon-accent/50 hover:bg-carbon-base/5'
              }`}
            >
              {/* Pipeline Flowing Dots Hover Effect */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute left-10 top-0 bottom-0 w-[1px] bg-carbon-accent/10"></div>
                <div className="absolute right-10 top-0 bottom-0 w-[1px] bg-carbon-accent/10"></div>
                
                {/* Dots running down the Y pipelines */}
                <div className="absolute left-[39px] w-1.5 h-1.5 rounded-full bg-carbon-accent/60 -translate-x-1/2 animate-[flow_2.5s_linear_infinite]"></div>
                <div className="absolute left-[39px] w-1.5 h-1.5 rounded-full bg-carbon-accent/60 -translate-x-1/2 animate-[flow_2.5s_linear_infinite_1.2s]"></div>
                <div className="absolute right-[41px] w-1.5 h-1.5 rounded-full bg-carbon-accent/60 translate-x-1/2 animate-[flow_2.5s_linear_infinite_0.6s]"></div>
                <div className="absolute right-[41px] w-1.5 h-1.5 rounded-full bg-carbon-accent/60 translate-x-1/2 animate-[flow_2.5s_linear_infinite_1.8s]"></div>
              </div>

              {currentProgress !== null ? (
                // Circular Progress Spinner Ring
                <div className="relative flex flex-col items-center justify-center space-y-4">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle cx="48" cy="48" r="42" stroke="#111f13" strokeWidth="4" fill="transparent" />
                      <circle 
                        cx="48" 
                        cy="48" 
                        r="42" 
                        stroke="#00f5d4" 
                        strokeWidth="4" 
                        fill="transparent"
                        strokeDasharray={263.89}
                        strokeDashoffset={263.89 - (263.89 * currentProgress) / 100}
                        className="transition-all duration-200"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-sm font-bold text-white font-display">{currentProgress}%</span>
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-wide font-display">Uploading pipeline...</h4>
                  <p className="text-xs text-gray-400">Normalizing data rows and running calculations</p>
                </div>
              ) : (
                // Base Drag zone content
                <div className="space-y-4 relative z-10">
                  <div className="mx-auto w-20 h-20 rounded-full bg-carbon-base/30 flex items-center justify-center border border-carbon-border group-hover:border-carbon-accent/30 group-hover:shadow-neon-cyan transition-all duration-300">
                    {pipeline.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-display text-white tracking-wide">{pipeline.title}</h3>
                    <p className="text-xs text-gray-500 max-w-[220px] mx-auto mt-1 leading-relaxed">{pipeline.desc}</p>
                  </div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-carbon-base/40 border border-carbon-border hover:border-carbon-accent text-xs font-semibold text-white cursor-pointer hover:bg-carbon-accent/5 transition-all duration-200">
                    <Upload className="w-3.5 h-3.5" />
                    Select File
                    <input 
                      type="file" 
                      accept={pipeline.accept}
                      onChange={(e) => handleFileChange(type, e)}
                      className="hidden" 
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upload History Table */}
      <div className="glass-panel p-6 rounded-2xl border border-carbon-border">
        <h3 className="text-lg font-bold font-display text-white mb-6">Pipeline Ingestion History</h3>
        
        {loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : uploads.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Info className="w-10 h-10 text-gray-600 mx-auto" />
            <h4 className="text-gray-400 font-medium text-sm">No uploads recorded yet</h4>
            <p className="text-xs text-gray-600">Upload an SAP TSV or utility CSV above to start tracking carbon.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-carbon-border text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Source Type</th>
                  <th className="py-3 px-4">Ingested At</th>
                  <th className="py-3 px-4">Rows parsed</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-carbon-border/40 text-sm text-gray-300">
                {uploads.map((upload) => (
                  <tr key={upload.id} className="hover:bg-carbon-base/5 transition-colors duration-150">
                    <td className="py-4 px-4 font-medium text-white flex items-center gap-2">
                      {getSourceIcon(upload.source_type)}
                      {upload.filename}
                    </td>
                    <td className="py-4 px-4 font-display font-medium text-xs tracking-wide text-carbon-accent">{upload.source_type}</td>
                    <td className="py-4 px-4 text-xs text-gray-500">
                      {new Date(upload.uploaded_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 font-semibold text-white">{upload.row_count} rows</td>
                    <td className="py-4 px-4">{getStatusBadge(upload.status)}</td>
                    <td className="py-4 px-4">
                      {upload.error_count > 0 ? (
                        <button 
                          onClick={() => setSelectedUpload(upload)}
                          className="flex items-center gap-1 text-xs text-carbon-rejected hover:text-red-400 font-semibold underline decoration-dotted transition-colors"
                        >
                          <AlertCircle className="w-4 h-4" />
                          {upload.error_count} failed rows
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sidebar Error log Drawer */}
      {selectedUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end transition-opacity duration-300">
          <div className="w-full max-w-lg bg-carbon-bg border-l border-carbon-border p-6 shadow-2xl h-full flex flex-col relative animate-[slide_0.3s_ease-out]">
            <div className="flex justify-between items-center pb-4 border-b border-carbon-border mb-6">
              <div>
                <h3 className="text-lg font-bold font-display text-white">Ingestion Error Logs</h3>
                <p className="text-xs text-gray-400 mt-1">{selectedUpload.filename}</p>
              </div>
              <button 
                onClick={() => setSelectedUpload(null)}
                className="p-1 rounded bg-carbon-base/40 border border-carbon-border hover:border-carbon-accent text-white"
              >
                Close Logs
              </button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-4 pr-1">
              <div className="bg-carbon-rejected/10 border border-carbon-rejected/30 rounded-lg p-4 flex gap-3 text-xs text-carbon-rejected">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Parsing Errors Detected</h4>
                  <p className="leading-relaxed">The following rows in the data import file could not be parsed. They were automatically skipped. Please review the reasons and formatting.</p>
                </div>
              </div>

              <div className="divide-y divide-carbon-border/40">
                {(selectedUpload.error_log || []).map((err, idx) => (
                  <div key={idx} className="py-4 space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-white">Row Number: #{err.row}</span>
                      <span className="text-carbon-rejected uppercase tracking-wider text-[10px]">Skipped</span>
                    </div>
                    <p className="text-xs text-gray-300 font-semibold bg-black/30 p-2.5 rounded border border-carbon-border">
                      {err.error}
                    </p>
                    {err.raw_values && (
                      <div className="text-[10px] text-gray-500 bg-carbon-card p-2 rounded max-h-24 overflow-y-auto">
                        <span className="font-semibold block mb-1">Raw Values:</span>
                        <pre className="font-mono whitespace-pre-wrap">{JSON.stringify(err.raw_values, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
