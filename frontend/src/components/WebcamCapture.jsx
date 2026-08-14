import React, { useRef, useState, useEffect } from 'react';
import { Camera, Video, Square, RefreshCw, Plus } from 'lucide-react';

function WebcamCapture({ mode, onCapture, API_BASE }) {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [error, setError] = useState('');
  
  // Camera selection and source states
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [activeSource, setActiveSource] = useState('webcam'); // 'webcam' or 'upload'
  
  // Recording states
  const [recording, setRecording] = useState(false);
  const [secondsRecorded, setSecondsRecorded] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDevices();
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (activeSource === 'webcam') {
      if (selectedDeviceId) {
        startCamera(selectedDeviceId);
      } else {
        startCamera();
      }
    } else {
      stopCamera();
    }
  }, [selectedDeviceId, activeSource]);

  const loadDevices = async () => {
    try {
      // First ask for webcam permission to unlock device labels
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop());
      
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.warn('Could not list video devices:', err);
      // Fallback: trigger camera start directly
      if (activeSource === 'webcam') {
        startCamera();
      }
    }
  };

  // Timer for video recording
  useEffect(() => {
    let interval = null;
    if (recording) {
      interval = setInterval(() => {
        setSecondsRecorded((prev) => prev + 1);
      }, 1000);
    } else {
      setSecondsRecorded(0);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [recording]);

  const startCamera = async (deviceId) => {
    setError('');
    try {
      if (streamRef.current) {
        stopCamera();
      }
      
      const constraints = {
        video: { 
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: 640, 
          height: 480 
        },
        audio: mode === 'video' // record audio only when in video mode
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStreamActive(true);
    } catch (err) {
      console.error('Webcam access error:', err);
      setError('Could not access laptop webcam. Please select "Mobile Camera" tab or check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStreamActive(false);
  };

  // Live Snapshot Capture
  const takeSnapshot = async () => {
    if (!videoRef.current || !streamActive) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      setUploading(true);
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setError('Failed to capture snapshot');
          setUploading(false);
          return;
        }

        const formData = new FormData();
        formData.append('image', blob, `snap-${Date.now()}.jpg`);

        try {
          const res = await fetch(`${API_BASE}/upload/image`, {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (res.ok) {
            onCapture(data.relativePath);
          } else {
            setError(data.error || 'Failed to upload photo');
          }
        } catch (err) {
          setError('Upload connection error');
        } finally {
          setUploading(false);
        }
      }, 'image/jpeg', 0.9);
      
    } catch (err) {
      setError('Photo capture error: ' + err.message);
    }
  };

  // Video Recording Mode (Live Webcam)
  const startRecording = () => {
    if (!streamRef.current) return;
    setRecordedChunks([]);
    setSecondsRecorded(0);

    try {
      const options = { mimeType: 'video/webm;codecs=vp8,opus' };
      let recorder;
      try {
        recorder = new MediaRecorder(streamRef.current, options);
      } catch (e) {
        recorder = new MediaRecorder(streamRef.current);
      }

      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          setRecordedChunks((prev) => [...prev, e.data]);
        }
      };

      recorder.onstop = async () => {
        setRecording(false);
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      setError('Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
    }
  };

  // Trigger upload once recordedChunks is populated
  useEffect(() => {
    if (recordedChunks.length > 0 && !recording && !uploading) {
      uploadVideoBlob();
    }
  }, [recordedChunks, recording]);

  const uploadVideoBlob = async () => {
    setUploading(true);
    setError('');
    try {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const formData = new FormData();
      formData.append('video', blob, `video-${Date.now()}.webm`);

      const res = await fetch(`${API_BASE}/upload/video`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        onCapture(data.relativePath);
      } else {
        setError(data.error || 'Failed to upload video');
      }
    } catch (err) {
      setError('Video upload connection error.');
    } finally {
      setUploading(false);
    }
  };

  // Handle Mobile File uploads (Image)
  const handleImageFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`${API_BASE}/upload/image`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        onCapture(data.relativePath);
      } else {
        setError(data.error || 'Failed to upload image');
      }
    } catch (err) {
      setError('Image upload connection error');
    } finally {
      setUploading(false);
    }
  };

  // Handle Mobile File uploads (Video)
  const handleVideoFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('video', file, `video-${Date.now()}.${file.name.split('.').pop()}`);

    try {
      const res = await fetch(`${API_BASE}/upload/video`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        onCapture(data.relativePath);
      } else {
        setError(data.error || 'Failed to upload video');
      }
    } catch (err) {
      setError('Video upload connection error.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Active Source Toggle Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button 
          type="button"
          onClick={() => { setActiveSource('webcam'); }}
          className={`btn ${activeSource === 'webcam' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}
        >
          Use Live Webcam
        </button>
        <button 
          type="button"
          onClick={() => { setActiveSource('upload'); }}
          className={`btn ${activeSource === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}
        >
          {mode === 'photo' ? 'Mobile Camera / Upload Image' : 'Mobile Camera / Upload Video'}
        </button>
      </div>

      {activeSource === 'webcam' ? (
        <>
          {devices.length > 0 && (
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Choose Active Camera Device</label>
              <select 
                value={selectedDeviceId} 
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 1rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: 'white', borderRadius: 'var(--radius-md)' }}
              >
                {devices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="camera-panel">
            {streamActive ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="camera-preview"
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-secondary)' }}>
                Camera inactive. Starting...
              </div>
            )}
            
            {recording && (
              <div className="countdown-timer">
                {secondsRecorded < 20 
                  ? `RECORDING: ${20 - secondsRecorded}s remaining` 
                  : `RECORDING: ${secondsRecorded}s (Min met)`}
              </div>
            )}
          </div>

          {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '0.5rem', textAlign: 'center' }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={() => startCamera(selectedDeviceId)} className="btn btn-secondary btn-icon-only" title="Refresh Camera">
              <RefreshCw size={18} />
            </button>

            {mode === 'photo' && (
              <button 
                type="button" 
                onClick={takeSnapshot} 
                disabled={!streamActive || uploading} 
                className="btn btn-primary"
              >
                <Camera size={18} />
                {uploading ? 'Uploading...' : 'Capture Item Image'}
              </button>
            )}

            {mode === 'video' && (
              <>
                {!recording ? (
                  <button 
                    type="button" 
                    onClick={startRecording} 
                    disabled={!streamActive || uploading} 
                    className="btn btn-primary"
                    style={{ backgroundColor: 'var(--color-danger)', color: 'white', boxShadow: 'none' }}
                  >
                    <Video size={18} />
                    Record Verification
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={stopRecording} 
                    disabled={secondsRecorded < 20} 
                    className="btn btn-primary"
                    style={{ backgroundColor: '#fff', color: '#000', boxShadow: 'none' }}
                    title={secondsRecorded < 20 ? 'Must record at least 20 seconds' : 'Stop Recording'}
                  >
                    <Square size={18} />
                    Stop Recording ({secondsRecorded}s)
                  </button>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        /* Upload Source Mode */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
          {mode === 'photo' ? (
            <>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                onChange={handleImageFileUpload} 
                style={{ display: 'none' }} 
                id="webcam-image-upload" 
              />
              <label htmlFor="webcam-image-upload" className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Camera size={20} />
                Take Photo / Select Image File
              </label>
              <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.8rem', textAlign: 'center' }}>
                Click above to take a picture using your mobile camera or upload an image file.
              </p>
            </>
          ) : (
            <>
              <input 
                type="file" 
                accept="video/*" 
                capture="environment" 
                onChange={handleVideoFileUpload} 
                style={{ display: 'none' }} 
                id="webcam-video-upload" 
              />
              <label htmlFor="webcam-video-upload" className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                <Video size={20} />
                Record Video / Select Video File
              </label>
              <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.8rem', textAlign: 'center' }}>
                Click above to record a video using your mobile camera or upload a video file.
              </p>
            </>
          )}
          {uploading && (
            <p style={{ marginTop: '1rem', color: 'var(--color-gold)', fontWeight: '500' }}>
              Uploading media file... please wait.
            </p>
          )}
          {error && (
            <p style={{ marginTop: '1rem', color: 'var(--color-danger)', fontSize: '0.85rem' }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default WebcamCapture;
