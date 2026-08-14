import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Camera, 
  Check, 
  AlertTriangle,
  RotateCcw,
  X,
  FileText
} from 'lucide-react';
import WebcamCapture from './WebcamCapture';

function ActiveLoans({ API_BASE }) {
  const [loans, setLoans] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form toggle & state
  const [showAddForm, setShowAddForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [goldWeight, setGoldWeight] = useState('');
  const [itemNames, setItemNames] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState(''); // Dynamic rate of interest per month
  const [remarks, setRemarks] = useState('');
  const [itemImages, setItemImages] = useState([]); // List of uploaded image relative paths

  // Camera toggle inside form
  const [showCamera, setShowCamera] = useState(false);

  // Large image preview modal
  const [previewImage, setPreviewImage] = useState(null);

  // Return Loan modal state
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState(null);
  const [paidStatus, setPaidStatus] = useState('Paid');
  const [totalInterestCollected, setTotalInterestCollected] = useState(0);
  const [totalAmountPaid, setTotalAmountPaid] = useState(0);
  const [returnVideoPath, setReturnVideoPath] = useState('');
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);

  useEffect(() => {
    fetchLoans();
  }, [search]);

  const fetchLoans = async () => {
    try {
      const res = await fetch(`${API_BASE}/loans?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (res.ok) {
        setLoans(data);
      } else {
        setError(data.error || 'Failed to fetch active loans');
      }
    } catch (err) {
      setError('Connection error fetching active loans');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setMobileNumber('');
    setGoldWeight('');
    setItemNames('');
    setLoanAmount('');
    setInterestRate('');
    setRemarks('');
    setItemImages([]);
    setShowCamera(false);
    setShowAddForm(false);
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    if (itemImages.length === 0) {
      alert('Please capture at least one gold item image using the webcam.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          mobileNumber,
          goldWeight,
          itemNames,
          itemImages,
          loanAmount,
          interestRate,
          remarks
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Loan successfully created with ID: ${data.loanId}`);
        resetForm();
        fetchLoans();
      } else {
        alert(data.error || 'Failed to create active loan');
      }
    } catch (err) {
      alert('Error creating active loan');
    }
  };

  const handleDeleteLoan = async (loanId) => {
    if (!confirm('Are you sure you want to permanently delete this loan? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/loans/${loanId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchLoans();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete loan');
      }
    } catch (err) {
      alert('Error deleting loan');
    }
  };

  // Open Return Wizard
  const openReturnModal = (loan) => {
    setSelectedLoanForReturn(loan);
    setPaidStatus('Paid');
    setTotalInterestCollected(loan.interestAccrued);
    setTotalAmountPaid(loan.totalPayable);
    setReturnVideoPath('');
    setIsRecordingVideo(false);
  };

  const handleFinalizeReturn = async () => {
    if (!returnVideoPath) {
      alert('You must record a minimum 20-second return verification video before finalizing.');
      return;
    }

    if (!confirm('Move this loan record from Active to Returned Loans?')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/loans/${selectedLoanForReturn.loan_id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidStatus,
          returnVideo: returnVideoPath,
          totalInterestCollected,
          totalAmountPaid
        })
      });

      if (res.ok) {
        alert('Loan returned successfully!');
        setSelectedLoanForReturn(null);
        fetchLoans();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to finalize return.');
      }
    } catch (err) {
      alert('Connection error finalising return.');
    }
  };

  const handleImageFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`${API_BASE}/upload/image`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        handlePhotoCapture(data.relativePath);
      } else {
        alert(data.error || 'Failed to upload image');
      }
    } catch (err) {
      alert('Upload connection error');
    }
  };

  const handlePhotoCapture = (relativePath) => {
    setItemImages((prev) => [...prev, relativePath]);
    alert('Gold item image captured successfully!');
  };

  const handleVideoCapture = (relativePath) => {
    setReturnVideoPath(relativePath);
    setIsRecordingVideo(false);
    alert('Return verification video captured and uploaded!');
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
          <h1 className="page-title">Active Customer Loans</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Enter new transactions and manage current outstanding loans
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={18} />
          {showAddForm ? 'View Active Loans' : 'Create New Loan'}
        </button>
      </div>

      {error && <div className="card-glass" style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>{error}</div>}

      {/* 1. Add/Create Loan Form Panel */}
      {showAddForm ? (
        <div className="card-glass" style={{ animation: 'slideUp 0.3s ease-out' }}>
          <h2 style={{ color: 'var(--color-gold)', marginBottom: '1.5rem' }}>New Loan Entry Form</h2>
          <form onSubmit={handleCreateLoan}>
            <div className="form-grid">
              <div className="form-group">
                <label>Customer Name *</label>
                <input 
                  type="text" 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)} 
                  placeholder="Enter full name"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Mobile Number *</label>
                <input 
                  type="tel" 
                  value={mobileNumber} 
                  onChange={(e) => setMobileNumber(e.target.value)} 
                  placeholder="10-digit number"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Gold Weight (grams) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={goldWeight} 
                  onChange={(e) => setGoldWeight(e.target.value)} 
                  placeholder="e.g. 15.45"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Item Names (Comma separated) *</label>
                <input 
                  type="text" 
                  value={itemNames} 
                  onChange={(e) => setItemNames(e.target.value)} 
                  placeholder="Chain, Ring, Bangle"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Loan Amount (Principal INR) *</label>
                <input 
                  type="number" 
                  value={loanAmount} 
                  onChange={(e) => setLoanAmount(e.target.value)} 
                  placeholder="Amount in Rupees"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Monthly Interest Rate (%) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={interestRate} 
                  onChange={(e) => setInterestRate(e.target.value)} 
                  placeholder="Rate per month (e.g. 1.5)"
                  required 
                />
              </div>
              <div className="form-group full-width">
                <label>Remarks</label>
                <textarea 
                  value={remarks} 
                  onChange={(e) => setRemarks(e.target.value)} 
                  placeholder="Add any description or notes..."
                  rows={2}
                />
              </div>
            </div>

            {/* Webcam Section inside Form */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem' }}>Gold Item Photo *</h3>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageFileUpload} 
                    style={{ display: 'none' }} 
                    id="mobile-image-upload" 
                  />
                  <label htmlFor="mobile-image-upload" className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                    <Plus size={16} />
                    Mobile Camera / Upload File
                  </label>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowCamera(!showCamera)}
                  >
                    <Camera size={16} />
                    {showCamera ? 'Hide Live Webcam' : 'Use Laptop Webcam'}
                  </button>
                </div>
              </div>

              {showCamera && (
                <div style={{ padding: '1rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                  <WebcamCapture mode="photo" onCapture={handlePhotoCapture} API_BASE={API_BASE} />
                </div>
              )}

              {/* Captured Snapshots list */}
              <div>
                <label>Captured Item Images ({itemImages.length})</label>
                <div className="photo-grid">
                  {itemImages.map((path, idx) => (
                    <div className="photo-thumb" key={idx}>
                      <img src={`${API_BASE}/media/${path}`} alt="gold item" />
                      <button 
                        type="button" 
                        className="photo-remove"
                        onClick={() => setItemImages(itemImages.filter((_, i) => i !== idx))}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  {itemImages.length === 0 && (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', gridColumn: '1 / -1' }}>
                      No images captured yet. Open the camera above to snap item pictures.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save & Create Loan
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* 2. Active Loans Table Panel */
        <div className="card-glass">
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={18} />
              <input 
                type="text" 
                placeholder="Search active loans by ID, Name, Mobile, Item, or Date..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ color: 'var(--color-text-secondary)' }}>Loading active loans list...</div>
          ) : (
            <div className="table-container">
              {loans.length === 0 ? (
                <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  No active loans found.
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Loan ID</th>
                      <th>Date & Time</th>
                      <th>Customer Details</th>
                      <th>Items & Weight</th>
                      <th>Images</th>
                      <th>Rate (p.m.)</th>
                      <th>Principal</th>
                      <th>Duration</th>
                      <th>Interest Accrued</th>
                      <th>Total Payable</th>
                      <th>Remarks</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map((loan) => (
                      <tr key={loan.loan_id}>
                        <td style={{ fontWeight: '600', color: 'var(--color-gold)', fontSize: '0.85rem' }}>
                          {loan.loan_id}
                        </td>
                        <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          {formatDate(loan.created_at)}
                        </td>
                        <td>
                          <div style={{ fontWeight: '600' }}>{loan.customer_name}</div>
                          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{loan.mobile_number}</div>
                        </td>
                        <td>
                          <div>{loan.item_names}</div>
                          <div style={{ color: 'var(--color-gold)', fontSize: '0.8rem', fontWeight: '500' }}>
                            {loan.gold_weight}g
                          </div>
                        </td>
                        <td>
                          <div className="image-gallery-flex">
                            {loan.item_images && loan.item_images.map((img, i) => (
                              <img 
                                key={i}
                                src={`${API_BASE}/media/${img}`} 
                                className="img-preview-icon" 
                                alt="item thumbnail"
                                onClick={() => setPreviewImage(img)}
                              />
                            ))}
                          </div>
                        </td>
                        <td style={{ fontWeight: '500' }}>{loan.daily_interest_rate}%</td>
                        <td style={{ fontWeight: '600' }}>{formatCurrency(loan.loan_amount)}</td>
                        <td style={{ textAlign: 'center', fontWeight: '500', whiteSpace: 'nowrap' }}>{loan.durationText || `${loan.daysPassed} days`}</td>
                        <td style={{ color: 'var(--color-danger)', fontWeight: '600' }}>
                          {formatCurrency(loan.interestAccrued)}
                        </td>
                        <td style={{ color: 'var(--color-success)', fontWeight: '700' }}>
                          {formatCurrency(loan.totalPayable)}
                        </td>
                        <td style={{ fontSize: '0.85rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={loan.remarks}>
                          {loan.remarks || '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button 
                              className="btn btn-secondary" 
                              onClick={() => openReturnModal(loan)}
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: 'var(--color-gold)', borderColor: 'rgba(251, 191, 36, 0.3)' }}
                            >
                              <RotateCcw size={14} />
                              Return
                            </button>
                            <button 
                              className="btn btn-danger btn-icon-only"
                              onClick={() => handleDeleteLoan(loan.loan_id)}
                              title="Delete permanently"
                            >
                              <Trash2 size={14} />
                            </button>
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

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="modal-overlay" onClick={() => setPreviewImage(null)}>
          <div className="modal-content" style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ width: '100%' }}>
              <h3>Item Image Full Preview</h3>
              <button className="modal-close" onClick={() => setPreviewImage(null)}>
                <X size={20} />
              </button>
            </div>
            <img 
              src={`${API_BASE}/media/${previewImage}`} 
              alt="large preview" 
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
            />
          </div>
        </div>
      )}

      {/* Return Loan Wizard Modal */}
      {selectedLoanForReturn && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h2>Return Verification Wizard</h2>
              <button className="modal-close" onClick={() => setSelectedLoanForReturn(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem', marginTop: '1rem' }}>
              {/* Left Column: Loan Summary & Return Form inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ color: 'var(--color-gold)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Loan Summary</h4>
                  <p style={{ fontSize: '0.85rem' }}>ID: <strong>{selectedLoanForReturn.loan_id}</strong></p>
                  <p style={{ fontSize: '0.85rem' }}>Customer: {selectedLoanForReturn.customer_name}</p>
                  <p style={{ fontSize: '0.85rem' }}>Principal: {formatCurrency(selectedLoanForReturn.loan_amount)}</p>
                  <p style={{ fontSize: '0.85rem' }}>Duration: <strong>{selectedLoanForReturn.durationText || `${selectedLoanForReturn.daysPassed} days`}</strong></p>
                  <p style={{ fontSize: '0.85rem' }}>Interest Accrued: {formatCurrency(selectedLoanForReturn.interestAccrued)}</p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Payable: {formatCurrency(selectedLoanForReturn.totalPayable)}</p>
                </div>

                <div className="form-group">
                  <label>Paid Status Dropdown</label>
                  <select 
                    value={paidStatus} 
                    onChange={(e) => setPaidStatus(e.target.value)}
                  >
                    <option value="Paid">Paid (TRUE)</option>
                    <option value="Unpaid">Unpaid (FALSE)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Total Interest Collected (INR)</label>
                  <input 
                    type="number" 
                    value={totalInterestCollected} 
                    onChange={(e) => setTotalInterestCollected(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label>Total Amount Collected (INR)</label>
                  <input 
                    type="number" 
                    value={totalAmountPaid} 
                    onChange={(e) => setTotalAmountPaid(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Right Column: Webcam Video Verification */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '100%' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                    Webcam Verification Video *
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textAlign: 'center' }}>
                    A minimum 20-second video recording of item handback and payment verification is required.
                  </p>
                  
                  {!returnVideoPath ? (
                    <div style={{ width: '100%', padding: '0.5rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                      <WebcamCapture mode="video" onCapture={handleVideoCapture} API_BASE={API_BASE} />
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', width: '100%' }}>
                      <div style={{ padding: '2rem 1rem', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '0.5rem' }}>
                        <Check size={30} style={{ margin: '0 auto 0.5rem auto' }} />
                        <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>Video Recorded & Saved</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>{returnVideoPath.split('/').pop()}</p>
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => setReturnVideoPath('')}
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                      >
                        Record Again
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1.5rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setSelectedLoanForReturn(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleFinalizeReturn}
                disabled={!returnVideoPath}
                title={!returnVideoPath ? 'Please record the verification video first' : 'Move to Returned Loans'}
              >
                Finalize Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActiveLoans;
