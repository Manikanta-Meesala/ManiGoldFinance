import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  X,
  Calendar,
  DollarSign
} from 'lucide-react';

function ReturnedLoans({ API_BASE }) {
  const [loans, setLoans] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [previewImage, setPreviewImage] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);

  useEffect(() => {
    fetchReturnedLoans();
  }, [search]);

  const fetchReturnedLoans = async () => {
    try {
      const res = await fetch(`${API_BASE}/returned-loans?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (res.ok) {
        setLoans(data);
      } else {
        setError(data.error || 'Failed to fetch returned loans');
      }
    } catch (err) {
      setError('Connection error fetching returned loans');
    } finally {
      setLoading(false);
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
          <h1 className="page-title">Returned Loans History</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Browse closed gold loans, collected interests, and verification media
          </p>
        </div>
      </div>

      {error && <div className="card-glass" style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>{error}</div>}

      <div className="card-glass">
        {/* Search Input */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search returned records by ID, Name, Mobile, Item, or Return Date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ color: 'var(--color-text-secondary)' }}>Loading returned history...</div>
        ) : (
          <div className="table-container">
            {loans.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No returned loans found.
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Loan ID</th>
                    <th>Orig. Date</th>
                    <th>Return Date</th>
                    <th>Customer Details</th>
                    <th>Gold Details</th>
                    <th>Principal</th>
                    <th>Interest Collected</th>
                    <th>Total Paid</th>
                    <th>Paid Status</th>
                    <th>Item Photo</th>
                    <th>Return Video</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => (
                    <tr key={loan.loan_id}>
                      <td style={{ fontWeight: '600', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        {loan.loan_id}
                      </td>
                      <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {formatDate(loan.created_at)}
                      </td>
                      <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', fontWeight: '500', color: 'var(--color-gold)' }}>
                        {formatDate(loan.returned_at)}
                      </td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{loan.customer_name}</div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{loan.mobile_number}</div>
                      </td>
                      <td>
                        <div>{loan.item_names}</div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                          {loan.gold_weight}g
                        </div>
                      </td>
                      <td style={{ fontWeight: '500' }}>{formatCurrency(loan.loan_amount)}</td>
                      <td style={{ color: 'var(--color-success)', fontWeight: '500' }}>
                        {formatCurrency(loan.total_interest_collected)}
                      </td>
                      <td style={{ fontWeight: '600' }}>{formatCurrency(loan.total_amount_paid)}</td>
                      <td>
                        <span className={`badge ${loan.paid_status === 'Paid' ? 'paid' : 'unpaid'}`}>
                          {loan.paid_status}
                        </span>
                      </td>
                      <td>
                        {loan.item_images && loan.item_images.length > 0 ? (
                          <button 
                            className="btn btn-secondary btn-icon-only"
                            onClick={() => setPreviewImage(loan.item_images[0])}
                            title="View customer gold images"
                          >
                            <ImageIcon size={16} />
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {loan.return_video ? (
                          <button 
                            className="btn btn-secondary btn-icon-only"
                            style={{ color: 'var(--color-gold)', borderColor: 'rgba(251,191,36,0.3)' }}
                            onClick={() => setPreviewVideo(loan.return_video)}
                            title="Play 20s Return Verification Video"
                          >
                            <VideoIcon size={16} />
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={loan.remarks}>
                        {loan.remarks || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

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

      {/* Video Verification Playback Modal */}
      {previewVideo && (
        <div className="modal-overlay" onClick={() => setPreviewVideo(null)}>
          <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>20-Second Return Video Verification</h3>
              <button className="modal-close" onClick={() => setPreviewVideo(null)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <video 
                src={`${API_BASE}/media/${previewVideo}`} 
                controls 
                autoPlay 
                className="video-preview-player"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReturnedLoans;
