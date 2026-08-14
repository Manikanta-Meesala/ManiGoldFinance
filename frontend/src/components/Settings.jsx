import React, { useState } from 'react';
import { Database, Lock, FolderOpen, Save, RefreshCw, CheckCircle } from 'lucide-react';

function Settings({ API_BASE, storagePath, username, onUsernameChange, onPathChange }) {
  // Username update
  const [newUsername, setNewUsername] = useState('');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [usernameError, setUsernameError] = useState('');

  // Password update
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Storage path update
  const [newPath, setNewPath] = useState(storagePath);
  const [pathMessage, setPathMessage] = useState('');
  const [pathError, setPathError] = useState('');

  // Backup status
  const [backupMessage, setBackupMessage] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    setUsernameMessage('');
    setUsernameError('');

    if (!newUsername.trim()) {
      setUsernameError('Username cannot be empty');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/change-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUsername: username, newUsername })
      });
      const data = await res.json();
      if (res.ok) {
        setUsernameMessage('Username updated successfully!');
        onUsernameChange(newUsername);
        setNewUsername('');
      } else {
        setUsernameError(data.error || 'Failed to update username');
      }
    } catch (err) {
      setUsernameError('Network error updating username');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, oldPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMessage('Password changed successfully!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setPasswordError('Network error updating password');
    }
  };

  const handleUpdatePath = async (e) => {
    e.preventDefault();
    setPathMessage('');
    setPathError('');

    if (!newPath.trim()) {
      setPathError('Path cannot be empty');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath: newPath })
      });
      const data = await res.json();
      if (res.ok) {
        setPathMessage('Storage location updated successfully!');
        onPathChange(data.storagePath);
      } else {
        setPathError(data.error || 'Failed to update storage path');
      }
    } catch (err) {
      setPathError('Network error updating storage path');
    }
  };

  const handleTriggerBackup = async () => {
    setBackupMessage('');
    setBackupLoading(true);
    try {
      const res = await fetch(`${API_BASE}/backup`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setBackupMessage(`Backup completed successfully! Saved as: ${data.fileName}`);
      } else {
        setBackupMessage('Backup failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      setBackupMessage('Network error triggering manual backup.');
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <div>
      <div className="header">
        <div>
          <h1 className="page-title">Application Settings</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Configure local folders, database backups, and administrator security
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Left Column: Storage & Backup */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Storage Path Config */}
          <div className="card-glass">
            <h2 style={{ color: 'var(--color-gold)', fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderOpen size={18} />
              Local Storage Location
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              All SQLite database files, gold item snapshots, and return verification videos are saved here. You can relocate the storage folder by typing the new path below.
            </p>
            <form onSubmit={handleUpdatePath}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Current Storage Path</label>
                <input 
                  type="text" 
                  value={newPath} 
                  onChange={(e) => setNewPath(e.target.value)} 
                  required
                />
              </div>
              {pathError && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{pathError}</p>}
              {pathMessage && <p style={{ color: 'var(--color-success)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{pathMessage}</p>}
              
              <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
                <Save size={16} />
                Update Storage Path
              </button>
            </form>
          </div>

          {/* Database Backup Panel */}
          <div className="card-glass">
            <h2 style={{ color: 'var(--color-gold)', fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={18} />
              Database Backups
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              The system automatically copies your active database to a backup folder once every 7 days. You can also trigger a manual backup at any time.
            </p>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.8rem' }}>Backup Folder: <strong style={{ color: 'var(--color-gold)' }}>{storagePath}\backups</strong></p>
            </div>
            
            {backupMessage && (
              <div style={{ display: 'flex', gap: '0.5rem', color: backupMessage.includes('failed') ? 'var(--color-danger)' : 'var(--color-success)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                <CheckCircle size={14} />
                <span>{backupMessage}</span>
              </div>
            )}

            <button 
              type="button" 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={handleTriggerBackup}
              disabled={backupLoading}
            >
              <RefreshCw size={16} className={backupLoading ? 'animate-spin' : ''} />
              {backupLoading ? 'Backing up...' : 'Run Manual Backup Now'}
            </button>
          </div>
        </div>

        {/* Right Column: Security Credentials */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Change Username */}
          <div className="card-glass">
            <h2 style={{ color: 'var(--color-gold)', fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={18} />
              Change Admin Username
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              Current Admin Username: <strong style={{ color: 'var(--color-text-primary)' }}>{username}</strong>
            </p>
            <form onSubmit={handleUpdateUsername}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>New Username</label>
                <input 
                  type="text" 
                  value={newUsername} 
                  onChange={(e) => setNewUsername(e.target.value)} 
                  placeholder="Enter new username"
                  required
                />
              </div>
              {usernameError && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{usernameError}</p>}
              {usernameMessage && <p style={{ color: 'var(--color-success)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{usernameMessage}</p>}
              
              <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
                Update Username
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="card-glass">
            <h2 style={{ color: 'var(--color-gold)', fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={18} />
              Change Admin Password
            </h2>
            <form onSubmit={handleUpdatePassword}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Current Password</label>
                <input 
                  type="password" 
                  value={oldPassword} 
                  onChange={(e) => setOldPassword(e.target.value)} 
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>New Password</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required
                />
              </div>
              {passwordError && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{passwordError}</p>}
              {passwordMessage && <p style={{ color: 'var(--color-success)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{passwordMessage}</p>}
              
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Update Password
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}

export default Settings;
