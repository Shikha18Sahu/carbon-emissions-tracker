import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-carbon-approved" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-carbon-flagged" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-carbon-rejected" />;
      default:
        return <Info className="w-5 h-5 text-carbon-accent" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-carbon-approved';
      case 'warning':
        return 'border-carbon-flagged';
      case 'error':
        return 'border-carbon-rejected';
      default:
        return 'border-carbon-accent';
    }
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border bg-carbon-card shadow-lg ${getBorderColor()} transition-all duration-300 transform translate-y-0 opacity-100 max-w-sm w-80`}>
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
      <div className="flex-grow">
        <h4 className="text-sm font-semibold text-white font-display">{toast.title}</h4>
        <p className="text-xs text-gray-400 mt-1">{toast.message}</p>
      </div>
      <button 
        onClick={() => onClose(toast.id)} 
        className="flex-shrink-0 text-gray-500 hover:text-white transition-colors duration-200"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
