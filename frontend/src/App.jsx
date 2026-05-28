import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Toast from './components/Toast';
import Login from './pages/Login';
import ReviewDashboard from './pages/ReviewDashboard';
import UploadCenter from './pages/UploadCenter';
import RecordDetail from './pages/RecordDetail';
import AuditTrail from './pages/AuditTrail';
import { api, getAuthToken } from './services/api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [clientSlug, setClientSlug] = useState(localStorage.getItem('client_slug') || 'breatheesg-mfg');

  const addToast = (title, message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchSummary = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.getSummary();
      setSummary(data);
    } catch (err) {
      // Session might have expired
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSummary();
    }
  }, [isAuthenticated, clientSlug]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setActiveTab('dashboard');
    setClientSlug(localStorage.getItem('client_slug') || 'breatheesg-mfg');
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
    setSummary(null);
    setSelectedRecordId(null);
  };

  const handleClientChanged = (slug) => {
    setClientSlug(slug);
    addToast('Tenant Changed', `Switched workspace profile. Loading dataset...`, 'info');
    setSelectedRecordId(null);
  };

  const handleViewRecord = (id) => {
    setSelectedRecordId(id);
  };

  // FIX: refreshSummary passed to ReviewDashboard and RecordDetail
  // so carbon meter updates immediately after any approve/reject/bulk action
  const handleBackToLedger = () => {
    setSelectedRecordId(null);
    fetchSummary();
  };

  // Called by ReviewDashboard after any approve/reject/bulk action
  const handleSummaryRefresh = () => {
    fetchSummary();
  };

  if (!isAuthenticated) {
    return (
      <>
        <Login onLoginSuccess={handleLoginSuccess} addToast={addToast} />
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-carbon-bg text-gray-100 flex">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedRecordId(null);
        }}
        summary={summary}
        onLogout={handleLogout}
      />

      <div className="flex-grow pl-64 flex flex-col min-h-screen">
        <Header summary={summary} onClientChanged={handleClientChanged} />

        <main className="flex-grow p-8 mt-20 transition-opacity duration-200">
          {selectedRecordId ? (
            <RecordDetail
              recordId={selectedRecordId}
              onBack={handleBackToLedger}
              addToast={addToast}
              // FIX: after approve/reject in detail page, sidebar updates instantly
              onRecordAction={handleSummaryRefresh}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <ReviewDashboard
                  onViewRecord={handleViewRecord}
                  addToast={addToast}
                  // FIX: after approve/bulk approve in dashboard, sidebar updates instantly
                  onRecordAction={handleSummaryRefresh}
                />
              )}
              {activeTab === 'upload' && (
                <UploadCenter addToast={addToast} />
              )}
              {activeTab === 'audit' && (
                <AuditTrail addToast={addToast} />
              )}
            </>
          )}
        </main>
      </div>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
}