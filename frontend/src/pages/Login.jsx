import React, { useState } from 'react';
import { Leaf, Lock, User, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

export default function Login({ onLoginSuccess, addToast }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.login(username, password);
      addToast('Welcome Back', 'Successfully authenticated to Carbon Pulse review system.', 'success');
      onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
      addToast('Authentication Failed', err.message || 'Please check your credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-carbon-bg flex items-center justify-center relative px-4 overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-carbon-accent/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-carbon-approved/5 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl relative z-10 border border-carbon-border shadow-neon-cyan">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-carbon-base/50 flex items-center justify-center border border-carbon-accent/30 shadow-neon-cyan mb-4 animate-breath">
            <Leaf className="w-8 h-8 text-carbon-accent" />
          </div>
          <h1 className="text-3xl font-bold font-display text-white tracking-wide">Carbon Pulse</h1>
          <p className="text-gray-400 text-sm mt-1">Carbon Emissions Review Portal</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded bg-carbon-rejected/10 border border-carbon-rejected/30 text-carbon-rejected text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Username / Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-carbon-bg/80 border border-carbon-border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-carbon-accent transition-colors duration-200 text-sm"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-carbon-bg/80 border border-carbon-border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-carbon-accent transition-colors duration-200 text-sm"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white transition-colors duration-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-carbon-accent/80 hover:text-carbon-accent cursor-pointer transition-colors duration-200">
              Forgot password?
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-carbon-base hover:bg-carbon-base/80 border border-carbon-accent text-white font-semibold rounded-lg shadow-neon-cyan focus:outline-none transition-all duration-200 text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              'Enter Portal'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-carbon-border/40 text-center">
          <p className="text-xs text-gray-500">
            For development review: use username <code className="text-carbon-accent">admin</code> and password <code className="text-carbon-accent">password123</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
