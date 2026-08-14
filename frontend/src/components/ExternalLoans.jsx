import React, { useState, useEffect } from 'react';
import { Plus, Search, CheckCircle, RefreshCw } from 'lucide-react';

function ExternalLoans({ API_BASE }) {
  const [loans, setLoans] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form toggle & state
  const [showAddForm, setShowAddForm] = useState(false);
  const [originalLoanId, setOriginalLoanId] = useState('');
  const [externalShopName, setExternalShopName] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [externalInterestRate, setExternalInterestRate] = useState('');

  useEffect(() => {
    fetchExternalLoans();
  }, [search]);

  const fetchExternalLoans = async () => {
    try {
      const res = await fetch(`${API_BASE}/external-loans?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (res.ok) {
        setLoans(data);
      } else {
        setError(data.error || 'Failed to fetch external loans');
      }
    } catch (err) {
      setError('Connection error fetching external loans');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExternalLoan = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/external-loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalLoanId,
          externalShopName,
          amountReceived,
          externalInterestRate
        })
      });
      if (res.ok) {
        alert('External shop loan tracked successfully!');
        setOriginalLoanId('');
        setExternalShopName('');
        setAmountReceived('');
        setExternalInterestRate('');
        setShowAddForm(false);
        fetchExternalLoans();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to track external loan');
      }
    } catch (err) {
      alert('Error connecting to server.');
    }
  };

  const handleReceiveBack = async (externalLoanId) => {
    if (!confirm('Are you sure you have received back the gold from the external shop? This will finalize the interest calculation.')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/external-loans/${externalLoanId}/receive-back`, {
        method: 'PUT'
      });
      if (res.ok) {
        alert('Gold marked as received back!');
        fetchExternalLoans();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update external loan');
      }
    } catch (err) {
      alert('Error updating external loan');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(val || 0);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <div>
      <div className="header">
        <div>
          <h1 className="page-title">External Shop Loans</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Track and calculate running interest for customer gold pledged to external finance shops
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={18} />
          {showAddForm ? 'View External Loans' : 'Add External Pledge'}
        </button>
      </div>

      {error && <div className="card-glass" style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>{error}</div>}

      {/* 1. Add External Shop Loan Panel */}
      {showAddForm ? (
        <div className="card-glass" style={{ animation: 'slideUp 0.3s ease-out' }}>
          <h2 style={{ color: 'var(--color-gold)', marginBottom: '1.5rem' }}>Add External Shop Pledge</h2>
          <form onSubmit={handleCreateExternalLoan}>
            <div className="form-grid">
              <div className="form-group">
                <label>Original Loan Unique ID *</label>
                <input 
                  type="text" 
                  value={originalLoanId} 
                  onChange={(e) => setOriginalLoanId(e.target.value)} 
                  placeholder="e.g., MGF-20260613-0001"
                  required 
                />
              </div>
              <div className="form-group">
                <label>External Shop Name *</label>
                <input 
                  type="text" 
                  value={externalShopName} 
                  onChange={(e) => setExternalShopName(e.target.value)} 
                  placeholder="Enter shop name"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Amount Received (Principal INR) *</label>
                <input 
                  type="number" 
                  value={amountReceived} 
                  onChange={(e) => setAmountReceived(e.target.value)} 
                  placeholder="Rupees received"
                  required 
                />
              </div>
              <div className="form-group">
                <label>External Monthly Interest Rate (%) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={externalInterestRate} 
                  onChange={(e) => setExternalInterestRate(e.target.value)} 
                  placeholder="Rate per month (e.g. 1.2)"
                  required 
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save External Pledge
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* 2. External Shop Loans List Panel */
        <div className="card-glass">
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={18} />
              <input 
                type="text" 
                placeholder="Search external pledges by External ID, Original ID, Shop, or Date..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-secondary btn-icon-only" onClick={fetchExternalLoans} title="Refresh running interest calculations">
              <RefreshCw size={18} />
            </button>
          </div>

          {loading ? (
            <div style={{ color: 'var(--color-text-secondary)' }}>Loading external pledges...</div>
          ) : (
            <div className="table-container">
              {loans.length === 0 ? (
                <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  No external shop loans found.
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>External ID</th>
                      <th>Original ID</th>
                      <th>Date Pledged</th>
                      <th>External Shop Name</th>
                      <th>Rate (p.m.)</th>
                      <th>Principal</th>
                      <th>Days Passed</th>
                      <th>Running Interest</th>
                      <th>Total Outstanding</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map((loan) => (
                      <tr key={loan.external_loan_id}>
                        <td style={{ fontWeight: '600', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                          {loan.external_loan_id}
                        </td>
                        <td style={{ fontWeight: '600', color: 'var(--color-gold)', fontSize: '0.85rem' }}>
                          {loan.original_loan_id}
                        </td>
                        <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          {formatDate(loan.created_at)}
                        </td>
                        <td style={{ fontWeight: '500' }}>{loan.external_shop_name}</td>
                        <td style={{ fontWeight: '500' }}>{loan.external_interest_rate}%</td>
                        <td style={{ fontWeight: '600' }}>{formatCurrency(loan.amount_received)}</td>
                        <td style={{ textAlign: 'center' }}>{loan.daysPassed}</td>
                        <td style={{ color: 'var(--color-danger)', fontWeight: '600' }}>
                          {formatCurrency(loan.runningInterest)}
                        </td>
                        <td style={{ color: 'var(--color-success)', fontWeight: '700' }}>
                          {formatCurrency(loan.totalOutstanding)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {loan.received_back ? (
                            <span className="badge paid" style={{ whiteSpace: 'nowrap' }}>
                              Received Back
                            </span>
                          ) : (
                            <span className="badge unpaid" style={{ whiteSpace: 'nowrap' }}>
                              Active Pledge
                            </span>
                          )}
                          {loan.received_back_date && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', whiteSpace: 'nowrap' }}>
                              {formatDate(loan.received_back_date)}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            {!loan.received_back && (
                              <button 
                                className="btn btn-primary"
                                onClick={() => handleReceiveBack(loan.external_loan_id)}
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                              >
                                <CheckCircle size={14} />
                                Settle & Get Back
                              </button>
                            )}
                            {loan.received_back && (
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Closed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ExternalLoans;
