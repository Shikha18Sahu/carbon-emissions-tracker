import React, { useState, useEffect } from 'react';
import { Building2, Clock, Globe, Database } from 'lucide-react';
import { api, getClientSlug, setClientSlug } from '../services/api';

export default function Header({ summary, onClientChanged }) {
  const [clients, setClients] = useState([]);
  const [currentClient, setCurrentClient] = useState(getClientSlug());
  const [time, setTime] = useState(new Date());
  
  // Approved carbon rolling counter
  const [displayCarbonKg, setDisplayCarbonKg] = useState(0);

  const fetchClients = async () => {
    try {
      const data = await api.getClients();
      setClients(data.results || data);
    } catch (err) {
      // Fallback if client call fails or DB is unseeded
      setClients([{ id: 1, name: "breatheesg Manufacturing", slug: "breatheesg-mfg" }]);
    }
  };

  useEffect(() => {
    fetchClients();

    // Clock Interval
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Rolling counter logic
  useEffect(() => {
    if (summary) {
      const targetKg = Math.round(summary.total_co2e_tonnes * 1000);
      let startVal = displayCarbonKg;
      if (startVal === targetKg) return;
      
      const duration = 1000; // ms
      const frameRate = 30; // 30 fps
      const totalFrames = (duration / 1000) * frameRate;
      const increment = (targetKg - startVal) / totalFrames;
      
      let frame = 0;
      const counterTimer = setInterval(() => {
        frame++;
        startVal += increment;
        if (frame >= totalFrames) {
          clearInterval(counterTimer);
          setDisplayCarbonKg(targetKg);
        } else {
          setDisplayCarbonKg(Math.round(startVal));
        }
      }, 1000 / frameRate);

      return () => clearInterval(counterTimer);
    }
  }, [summary]);

  const handleClientChange = (e) => {
    const slug = e.target.value;
    setCurrentClient(slug);
    setClientSlug(slug);
    onClientChanged(slug);
  };

  return (
    <header className="h-20 border-b border-carbon-border bg-carbon-card/50 backdrop-blur-md px-8 flex justify-between items-center fixed top-0 right-0 left-64 z-20">
      
      {/* Client tenant Switcher */}
      <div className="flex items-center gap-3">
        <Building2 className="w-4 h-4 text-carbon-accent" />
        <select 
          value={currentClient}
          onChange={handleClientChange}
          className="bg-transparent border-0 text-xs font-bold text-white uppercase tracking-wider focus:outline-none cursor-pointer pr-8 pl-1 font-display"
        >
          {clients.map(client => (
            <option key={client.id} value={client.slug} className="bg-carbon-card text-white py-2">
              {client.name}
            </option>
          ))}
        </select>
      </div>

      {/* Clock and dynamic rolling counter */}
      <div className="flex items-center gap-8">
        
        {/* Live counter */}
        <div className="flex items-center gap-2.5 bg-carbon-base/30 border border-carbon-border/50 px-4 py-2 rounded-lg">
          <Database className="w-3.5 h-3.5 text-carbon-approved animate-pulse" />
          <div>
            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold block">Locked Footprint</span>
            <span className="text-xs font-bold font-mono text-white block">
              {displayCarbonKg.toLocaleString()} <span className="text-[10px] text-gray-400 font-semibold uppercase">kg CO2e</span>
            </span>
          </div>
        </div>

        {/* Real-time Clock */}
        <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold font-mono">
          <Clock className="w-4 h-4 text-carbon-accent" />
          <span>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </span>
          <span className="text-[10px] text-gray-600 block pl-2 border-l border-carbon-border">
            {time.toLocaleDateString([], { month: 'short', day: '2-digit' })}
          </span>
        </div>

      </div>

    </header>
  );
}
