import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  RotateCcw, 
  Building2, 
  DollarSign, 
  Calendar,
  ChevronRight,
  Sparkles,
  FileText
} from 'lucide-react';

function Dashboard({ API_BASE, setActiveTab }) {
  const [stats, setStats] = useState({
    totalActiveLoans: 0,
    totalReturnedLoans: 0,
    totalExternalLoans: 0,
    totalActiveAmount: 0,
    returnedTodayCount: 0
  });
  const [loading, setLoading] = useState(true);

  // Excel Export states
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toLocaleString('en-US', { month: 'long' })
  );
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleExportExcel = async () => {
    setExporting(true);
    setExportError('');
    try {
      const url = `${API_BASE}/export-excel?year=${selectedYear}&month=${selectedMonth}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate report');
      }

      // Trigger file download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `loans_record_${selectedYear}_${selectedMonth}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setExportError(err.message || 'Failed to download report');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard`);
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  if (loading) {
    return <div style={{ color: 'var(--color-text-secondary)' }}>Loading dashboard statistics...</div>;
  }

  return (
    <div>
      <div className="header">
        <div>
          <h1 className="page-title">ManiGold Dashboard</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Local Gold Finance Management System
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-gold)', fontSize: '0.95rem' }}>
          <Sparkles size={16} />
          <span>Single Admin Terminal</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="card-glass stat-card gold">
          <div className="stat-info">
            <h3>Active Loans</h3>
            <p>{stats.totalActiveLoans}</p>
          </div>
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="card-glass stat-card green">
          <div className="stat-info">
            <h3>Active Principal</h3>
            <p>{formatCurrency(stats.totalActiveAmount)}</p>
          </div>
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="card-glass stat-card blue">
          <div className="stat-info">
            <h3>Returned Loans</h3>
            <p>{stats.totalReturnedLoans}</p>
          </div>
          <div className="stat-icon">
            <RotateCcw size={24} />
          </div>
        </div>

        <div className="card-glass stat-card gold">
          <div className="stat-info">
            <h3>External Shop Loans</h3>
            <p>{stats.totalExternalLoans}</p>
          </div>
          <div className="stat-icon">
            <Building2 size={24} />
          </div>
        </div>

        <div className="card-glass stat-card green">
          <div className="stat-info">
            <h3>Returned Today</h3>
            <p>{stats.returnedTodayCount}</p>
          </div>
          <div className="stat-icon">
            <Calendar size={24} />
          </div>
        </div>
      </div>

      {/* Main Grid for Welcome and Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        <div className="card-glass" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '200px' }}>
          <h2 style={{ color: 'var(--color-gold)', marginBottom: '0.75rem' }}>Welcome to ManiGold Finance</h2>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6', fontSize: '0.95rem' }}>
            This application is running locally on your laptop and securing your local data. All gold item images and 20-second return verification videos are saved in organized folders structured as: <br/>
            <strong style={{ color: 'var(--color-text-primary)' }}>[Storage Path] &gt; [Year]folder &gt; [Month] folder</strong>.
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={() => setActiveTab('active')}>
              Manage Active Customer Loans
              <ChevronRight size={16} />
            </button>
            <button className="btn btn-secondary" onClick={() => setActiveTab('external')}>
              Track External Shop Loans
            </button>
          </div>
        </div>

        <div className="card-glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontSize: '1rem' }}>
            Quick Operations
          </h3>
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem 1rem' }}
            onClick={() => setActiveTab('active')}
          >
            Create New Customer Loan
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem 1rem' }}
            onClick={() => setActiveTab('returned')}
          >
            View Return History & Videos
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem 1rem' }}
            onClick={() => setActiveTab('settings')}
          >
            Check Storage & Backup Status
          </button>
        </div>
      </div>
      {/* Excel Export Card */}
      <div className="card-glass" style={{ marginTop: '2rem' }}>
        <h3 style={{ color: 'var(--color-gold)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} />
          Monthly Excel Records Export
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          Retrieve the complete historical ledger of active and returned loan records, including item images and return video filenames, exported directly into a spreadsheet workbook structured by year and month.
        </p>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.4rem', display: 'block' }}>Select Year</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{ padding: '0.65rem 1rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: 'white', borderRadius: 'var(--radius-md)', width: '100%' }}
            >
              {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.4rem', display: 'block' }}>Select Month</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '0.65rem 1rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: 'white', borderRadius: 'var(--radius-md)', width: '100%' }}
            >
              {monthsList.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleExportExcel} 
            className="btn btn-primary" 
            disabled={exporting}
            style={{ padding: '0.75rem 1.5rem' }}
          >
            {exporting ? 'Generating Excel...' : 'Export & Download Excel Report'}
          </button>
        </div>

        {exportError && (
          <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '1rem' }}>
            {exportError}
          </p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
