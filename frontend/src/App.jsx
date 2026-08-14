import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Coins, 
  RotateCcw, 
  Building2, 
  Settings, 
  LogOut, 
  FolderOpen,
  Lock
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import ActiveLoans from './components/ActiveLoans';
import ReturnedLoans from './components/ReturnedLoans';
import ExternalLoans from './components/ExternalLoans';
import SettingsView from './components/Settings';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [configured, setConfigured] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [storagePath, setStoragePath] = useState('');
  const [loading, setLoading] = useState(true);

  // Authentication Fields
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Config Fields
  const [pathInput, setPathInput] = useState('');
  const [configError, setConfigError] = useState('');

  useEffect(() => {
    checkConfiguration();
    // Retrieve session if available
    const savedUser = localStorage.getItem('mf_user');
    if (savedUser) {
      setAuthenticated(true);
      setUser(savedUser);
    }
  }, []);

  const checkConfiguration = async () => {
    try {
      const res = await fetch(`${API_BASE}/config/check`);
      const data = await res.json();
      if (data.configured) {
        setConfigured(true);
        setStoragePath(data.storagePath);
      } else {
        setConfigured(false);
      }
    } catch (err) {
      console.error('Failed to check configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigure = async (e) => {
    e.preventDefault();
    setConfigError('');
    if (!pathInput.trim()) {
      setConfigError('Please enter a valid directory path.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath: pathInput })
      });
      const data = await res.json();
      if (res.ok) {
        setConfigured(true);
        setStoragePath(data.storagePath);
      } else {
        setConfigError(data.error || 'Failed to initialize folder.');
      }
    } catch (err) {
      setConfigError('Failed to connect to backend server. Make sure it is running.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      const data = await res.json();
      if (res.ok) {
        setAuthenticated(true);
        setUser(data.username);
        localStorage.setItem('mf_user', data.username);
      } else {
        setLoginError(data.error || 'Invalid username or password.');
      }
    } catch (err) {
      setLoginError('Failed to connect to server.');
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setUser(null);
    localStorage.removeItem('mf_user');
  };

  if (loading) {
    return (
      <div className="auth-wrapper">
        <div className="logo-icon animate-pulse" style={{ width: 60, height: 60 }}>
          <Coins size={30} color="#0b0f19" />
        </div>
      </div>
    );
  }

  // 1. First-time Setup: Configure Storage Path
  if (!configured) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card card-glass">
          <div className="auth-logo">
            <div className="logo-icon">
              <FolderOpen size={24} color="#0b0f19" />
            </div>
            <div className="logo-text">ManiGoldFinance</div>
          </div>
          <h2>Initial Directory Setup</h2>
          <p className="auth-subtitle">
            Please specify the local drive and folder where all database records, customer snapshots, and video verifications will be stored.
          </p>
          <form onSubmit={handleConfigure}>
            <div className="form-group">
              <label>Absolute Folder Path (e.g., D:\ManiGoldFinanceData)</label>
              <input 
                type="text" 
                placeholder="C:\ManiGoldFinanceData" 
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                required
              />
            </div>
            {configError && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{configError}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Initialize Storage Location
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Authentication Screen
  if (!authenticated) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card card-glass">
          <div className="auth-logo">
            <div className="logo-icon">
              <Coins size={24} color="#0b0f19" />
            </div>
            <div className="logo-text">ManiGoldFinance</div>
          </div>
          <h2>Admin Login</h2>
          <p className="auth-subtitle">
            Enter your admin credentials to access the finance dashboard.
          </p>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username</label>
              <input 
                type="text" 
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Username (default: admin)"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Password (default: admin123)"
                required
              />
            </div>
            {loginError && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{loginError}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Login to System
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Main Dashboard Application
  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">
            <Coins size={22} color="#0b0f19" />
          </div>
          <div className="logo-text">ManiGold</div>
        </div>
        
        <nav className="nav-links">
          <button 
            className={`nav-item btn-secondary ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          <button 
            className={`nav-item btn-secondary ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <Coins size={18} />
            Active Loans
          </button>
          <button 
            className={`nav-item btn-secondary ${activeTab === 'returned' ? 'active' : ''}`}
            onClick={() => setActiveTab('returned')}
          >
            <RotateCcw size={18} />
            Returned Loans
          </button>
          <button 
            className={`nav-item btn-secondary ${activeTab === 'external' ? 'active' : ''}`}
            onClick={() => setActiveTab('external')}
          >
            <Building2 size={18} />
            External Shop
          </button>
          <button 
            className={`nav-item btn-secondary ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={18} />
            Settings
          </button>
          
          <button 
            className="nav-item btn-secondary logout-btn"
            onClick={handleLogout}
            style={{ marginTop: 'auto' }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard API_BASE={API_BASE} setActiveTab={setActiveTab} />}
        {activeTab === 'active' && <ActiveLoans API_BASE={API_BASE} />}
        {activeTab === 'returned' && <ReturnedLoans API_BASE={API_BASE} />}
        {activeTab === 'external' && <ExternalLoans API_BASE={API_BASE} />}
        {activeTab === 'settings' && (
          <SettingsView 
            API_BASE={API_BASE} 
            storagePath={storagePath} 
            username={user} 
            onUsernameChange={(newU) => setUser(newU)}
            onPathChange={(newPath) => setStoragePath(newPath)}
          />
        )}
      </main>
    </div>
  );
}

export default App;
