import React from 'react';
import { Leaf, LayoutDashboard, UploadCloud, ClipboardList, Database, LogOut } from 'lucide-react';
import { api } from '../services/api';

export default function Sidebar({ activeTab, setActiveTab, summary, onLogout }) {
  const currentTonnes = summary ? summary.total_co2e_tonnes : 0;
  const targetTonnes = 500;
  const fillPercentage = Math.min((currentTonnes / targetTonnes) * 100, 100);

  const menuItems = [
    { id: 'dashboard', label: 'Review Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'upload', label: 'Upload Center', icon: <UploadCloud className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Trail', icon: <ClipboardList className="w-4 h-4" /> },
  ];

  return (
    <div className="w-64 border-r border-carbon-border bg-carbon-card flex flex-col justify-between h-screen fixed top-0 left-0 z-30">
      
      {/* Brand & Logo */}
      <div className="p-6 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-carbon-base/50 flex items-center justify-center border border-carbon-accent/20 shadow-neon-cyan animate-breath">
            <Leaf className="w-5 h-5 text-carbon-accent" />
          </div>
          
          {/* Brand with leaf particle animations */}
          <div className="relative group">
            <span className="font-display font-bold text-lg text-white tracking-wide">Carbon Pulse</span>
            
            {/* Tiny floating leaves/particles */}
            <div className="absolute -top-1 -right-2 w-1.5 h-1.5 rounded-full bg-carbon-accent/60 opacity-0 group-hover:animate-[floatUp_1s_ease-out_infinite]"></div>
            <div className="absolute top-2 -right-3 w-1 h-1 rounded-full bg-carbon-approved/50 opacity-0 group-hover:animate-[floatUp_1.2s_ease-out_infinite_0.4s]"></div>
            <div className="absolute top-0 -right-4 w-1.5 h-1.5 rounded-full bg-carbon-accent/40 opacity-0 group-hover:animate-[floatUp_0.8s_ease-out_infinite_0.2s]"></div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-carbon-base border border-carbon-accent/30 text-carbon-accent shadow-neon-cyan' 
                  : 'text-gray-400 hover:bg-carbon-base/10 hover:text-white border border-transparent'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Carbon Meter Gauge */}
      <div className="px-6 py-4 flex flex-col items-center">
        <div className="w-full bg-carbon-bg border border-carbon-border p-4 rounded-xl flex items-center gap-4">
          {/* Vertical carbon tube */}
          <div className="w-4 h-32 bg-black/50 border border-carbon-border rounded-full relative overflow-hidden flex flex-col justify-end">
            <div 
              className="w-full bg-gradient-to-t from-carbon-approved via-carbon-accent to-white rounded-full transition-all duration-1000 ease-out shadow-neon-cyan"
              style={{ height: `${fillPercentage}%` }}
            ></div>
          </div>
          
          <div className="flex-grow space-y-1">
            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold block">Carbon Meter</span>
            <span className="text-sm font-bold text-white font-mono block">{currentTonnes.toFixed(1)}t</span>
            <span className="text-[9px] text-carbon-accent font-semibold block">Target: {targetTonnes}t</span>
          </div>
        </div>
      </div>

      {/* Profile & Logout */}
      <div className="p-6 border-t border-carbon-border/50">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-white block">Auditor Portal</span>
            <span className="text-[10px] text-gray-500 block">admin@carbonpulse.com</span>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 rounded bg-carbon-base/30 border border-carbon-border hover:border-carbon-rejected text-gray-400 hover:text-carbon-rejected transition-all"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Keyframe floats defined here */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-20px) scale(1); opacity: 0; }
        }
      `}</style>

    </div>
  );
}
