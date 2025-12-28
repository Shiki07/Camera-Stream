const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3002;
// API Key authentication - set via environment variable
const API_KEY = process.env.PI_SERVICE_API_KEY;

// Validate API key strength on startup
const MIN_API_KEY_LENGTH = 32;
const isApiKeyStrong = API_KEY && API_KEY.length >= MIN_API_KEY_LENGTH;

// Recording state management
// Map<recordingId, { process, filename, startTime, stopping, stoppedBy }>
const activeRecordings = new Map();

// Rate-limit FFmpeg progress logging (once per second max)
const lastLogTime = new Map();
const LOG_INTERVAL_MS = 1000;

function shouldLogProgress(recordingId) {
  const now = Date.now();
  const lastLog = lastLogTime.get(recordingId) || 0;
  if (now - lastLog >= LOG_INTERVAL_MS) {
    lastLogTime.set(recordingId, now);
    return true;
  }
  return false;
}

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticateApiKey = (req, res, next) => {
  // Allow health endpoint without auth for basic connectivity checks
  if (req.path === '/health') {
    return next();
  }

  // SECURITY: API key is now MANDATORY - refuse requests if not configured
  if (!API_KEY) {
    console.error('PI_SERVICE_API_KEY not set. Request rejected for security.');
    return res.status(503).json({ 
      error: 'Service Not Configured',
      message: 'PI_SERVICE_API_KEY environment variable must be set. Generate with: openssl rand -hex 32'
    });
  }

  // SECURITY: Reject weak API keys
  if (!isApiKeyStrong) {
    console.error('PI_SERVICE_API_KEY is too weak. Minimum 32 characters required.');
    return res.status(503).json({ 
      error: 'Weak API Key',
      message: `PI_SERVICE_API_KEY must be at least ${MIN_API_KEY_LENGTH} characters. Generate with: openssl rand -hex 32`
    });
  }

  const providedKey = req.headers['x-api-key'];

  if (!providedKey) {
    console.warn('Request rejected: Missing X-API-Key header');
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Missing X-API-Key header'
    });
  }

  if (providedKey !== API_KEY) {
    console.warn('Request rejected: Invalid API key');
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Invalid API key'
    });
  }

  next();
};

// Apply authentication to all routes
app.use(authenticateApiKey);

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // Create Videos directory if it doesn't exist
    const videosDir = '/home/pi/Videos'; // SD card mount point
    await fs.ensureDir(videosDir);
    cb(null, videosDir);
  },
  filename: (req, file, cb) => {
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const motionPrefix = req.body.motion_detected === 'true' ? 'motion_' : 'manual_';
    const filename = `${motionPrefix}${timestamp}_${file.originalname}`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'running',
    timestamp: new Date().toISOString(),
    videosPath: '/home/pi/Videos',
    authEnabled: !!API_KEY
  });
});

// File upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('Received file upload request');
    console.log('File:', req.file);
    console.log('Body:', req.body);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { recording_id, recorded_at, motion_detected } = req.body;

    // Log the upload
    const logEntry = {
      timestamp: new Date().toISOString(),
      recording_id,
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      recorded_at,
      motion_detected: motion_detected === 'true',
      saved_path: req.file.path
    };

    // Save upload log
    const logPath = '/home/pi/Videos/upload_log.json';
    let logs = [];
    
    try {
      if (await fs.pathExists(logPath)) {
        logs = await fs.readJson(logPath);
      }
    } catch (error) {
      console.warn('Could not read existing log file, creating new one');
    }

    logs.push(logEntry);
    await fs.writeJson(logPath, logs, { spaces: 2 });

    console.log(`File saved successfully: ${req.file.path}`);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      details: error.message 
    });
  }
});

// Get recordings list
app.get('/recordings', async (req, res) => {
  try {
    const videosDir = '/home/pi/Videos';
    const files = await fs.readdir(videosDir);
    
    const recordings = files
      .filter(file => file.endsWith('.webm') || file.endsWith('.mp4'))
      .map(file => ({
        filename: file,
        path: path.join(videosDir, file),
        isMotionTriggered: file.startsWith('motion_')
      }));

    res.json({ recordings });
  } catch (error) {
    console.error('Error listing recordings:', error);
    res.status(500).json({ error: 'Failed to list recordings' });
  }
});

// Start recording endpoint
app.post('/recording/start', async (req, res) => {
  try {
    const { recording_id, stream_url, quality = 'medium', motion_triggered = false, video_path } = req.body;

    if (!recording_id || !stream_url) {
      return res.status(400).json({ error: 'recording_id and stream_url are required' });
    }

    // Check if already recording
    if (activeRecordings.has(recording_id)) {
      const existing = activeRecordings.get(recording_id);
      // If it's stopping, wait a moment then re-check
      if (existing.stopping) {
        return res.status(409).json({ 
          error: 'Recording is currently stopping',
          message: 'Please wait for the current recording to finish stopping'
        });
      }
      return res.status(400).json({ error: 'Recording already in progress' });
    }

    // Use provided video_path or default to /home/pi/Videos
    const videosDir = video_path || '/home/pi/Videos';
    await fs.ensureDir(videosDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const prefix = motion_triggered ? 'motion_' : 'manual_';
    const filename = `${prefix}pi_${timestamp}.mp4`;
    const filepath = path.join(videosDir, filename);

    console.log(`[${recording_id}] Starting recording`);
    console.log(`[${recording_id}] Stream URL: ${stream_url}`);
    console.log(`[${recording_id}] Output file: ${filepath}`);
    console.log(`[${recording_id}] Quality: ${quality}`);

    // FFmpeg parameters based on quality
    const qualityPresets = {
      high: { fps: 25, bitrate: '2000k', scale: '1920:1080' },
      medium: { fps: 20, bitrate: '1000k', scale: '1280:720' },
      low: { fps: 15, bitrate: '500k', scale: '640:480' }
    };

    const preset = qualityPresets[quality] || qualityPresets.medium;

    // Use local stream URL to prevent feed freezing (FFmpeg connects to localhost:8000)
    const localStreamUrl = 'http://localhost:8000/stream.mjpg';
    console.log(`[${recording_id}] Using local stream: ${localStreamUrl}`);
    
    // FFmpeg command to capture from MJPEG stream
    const ffmpegArgs = [
      '-f', 'mjpeg',
      '-r', preset.fps.toString(),
      '-i', localStreamUrl,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-b:v', preset.bitrate,
      '-vf', `scale=${preset.scale}`,
      '-f', 'mp4',
      '-movflags', 'frag_keyframe+empty_moov',
      '-y',
      filepath
    ];

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    // Store recording info with stopping flag
    const recordingState = {
      process: ffmpeg,
      filename,
      filepath,
      startTime: Date.now(),
      quality,
      motion_triggered,
      stopping: false,
      stoppedBy: null, // 'api' or 'signal' or 'error'
      exitCode: null,
      exitSignal: null
    };
    
    activeRecordings.set(recording_id, recordingState);

    // Send response immediately (async FFmpeg startup)
    res.json({
      success: true,
      message: 'Recording started',
      recording_id,
      filename,
      started_at: new Date().toISOString()
    });

    // Handle FFmpeg output (async after response sent)
    ffmpeg.stdout.on('data', (data) => {
      if (shouldLogProgress(recording_id)) {
        console.log(`[${recording_id}] FFmpeg stdout: ${data}`);
      }
    });

    ffmpeg.stderr.on('data', (data) => {
      // FFmpeg outputs progress to stderr - rate limit logging
      const dataStr = data.toString();
      // Always log errors and important messages
      if (dataStr.includes('error') || dataStr.includes('Error') || dataStr.includes('failed')) {
        console.error(`[${recording_id}] FFmpeg error: ${dataStr}`);
      } else if (shouldLogProgress(recording_id)) {
        // Rate-limited progress logging
        const frameMatch = dataStr.match(/frame=\s*(\d+)/);
        const timeMatch = dataStr.match(/time=([^\s]+)/);
        if (frameMatch && timeMatch) {
          console.log(`[${recording_id}] Progress: frame=${frameMatch[1]} time=${timeMatch[1]}`);
        }
      }
    });

    ffmpeg.on('error', (error) => {
      console.error(`[${recording_id}] FFmpeg spawn error:`, error);
      recordingState.stoppedBy = 'error';
      activeRecordings.delete(recording_id);
      lastLogTime.delete(recording_id);
    });

    // Use 'close' event instead of 'exit' for reliable cleanup
    ffmpeg.on('close', (code, signal) => {
      recordingState.exitCode = code;
      recordingState.exitSignal = signal;
      
      // Determine if this was a normal shutdown
      const wasGraceful = signal === 'SIGINT' || signal === 'SIGTERM' || code === 0;
      const wasApiStopped = recordingState.stoppedBy === 'api';
      
      if (wasGraceful || wasApiStopped) {
        console.log(`[${recording_id}] Recording ended normally (code=${code}, signal=${signal})`);
      } else if (code !== null && code !== 0) {
        console.warn(`[${recording_id}] FFmpeg exited with code ${code} (signal=${signal})`);
      }
      
      // Only delete if not already deleted by stop endpoint
      if (activeRecordings.has(recording_id)) {
        activeRecordings.delete(recording_id);
      }
      lastLogTime.delete(recording_id);
    });

  } catch (error) {
    console.error('Start recording error:', error);
    res.status(500).json({ 
      error: 'Failed to start recording',
      details: error.message 
    });
  }
});

// Stop recording endpoint - IDEMPOTENT
app.post('/recording/stop', async (req, res) => {
  try {
    const { recording_id } = req.body;

    if (!recording_id) {
      return res.status(400).json({ error: 'recording_id is required' });
    }

    const recording = activeRecordings.get(recording_id);

    // IDEMPOTENT: If recording doesn't exist, return success with already_stopped flag
    if (!recording) {
      console.log(`[${recording_id}] Stop requested but recording not found (already stopped)`);
      return res.json({ 
        success: true,
        already_stopped: true,
        message: 'Recording already stopped or not found',
        recording_id
      });
    }

    // IDEMPOTENT: If already stopping, return success immediately
    if (recording.stopping) {
      console.log(`[${recording_id}] Stop already in progress, returning success`);
      return res.json({
        success: true,
        already_stopping: true,
        message: 'Recording stop already in progress',
        recording_id
      });
    }

    // Mark as stopping to prevent double-stop
    recording.stopping = true;
    recording.stoppedBy = 'api';
    const stopTime = Date.now();

    console.log(`[${recording_id}] Stopping recording...`);

    // Step 1: Send SIGINT for graceful FFmpeg shutdown
    recording.process.kill('SIGINT');
    
    // Step 2: Wait for FFmpeg to close gracefully (max 3 seconds)
    let exitedGracefully = false;
    let closeTimeout = null;
    
    const closePromise = new Promise((resolve) => {
      const onClose = () => {
        if (closeTimeout) {
          clearTimeout(closeTimeout);
          closeTimeout = null;
        }
        exitedGracefully = true;
        console.log(`[${recording_id}] FFmpeg closed gracefully`);
        resolve(true);
      };
      
      // Listen for close event (reliable, fires after stdio closed)
      recording.process.once('close', onClose);
      
      closeTimeout = setTimeout(() => {
        recording.process.removeListener('close', onClose);
        console.log(`[${recording_id}] Graceful shutdown timeout`);
        resolve(false);
      }, 3000);
    });
    
    exitedGracefully = await closePromise;
    
    // Step 3: If still running, force kill with SIGKILL
    if (!exitedGracefully && !recording.process.killed) {
      console.log(`[${recording_id}] Forcing SIGKILL`);
      recording.process.kill('SIGKILL');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Step 4: Brief wait for file system to flush
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check if file exists and get stats
    let fileSize = 0;
    let duration = Math.round((stopTime - recording.startTime) / 1000);
    
    try {
      const stats = await fs.stat(recording.filepath);
      fileSize = stats.size;
      console.log(`[${recording_id}] File saved: ${fileSize} bytes, ${duration}s`);
    } catch (error) {
      console.warn(`[${recording_id}] Could not get file stats:`, error.message);
    }

    // Cleanup
    activeRecordings.delete(recording_id);
    lastLogTime.delete(recording_id);

    res.json({
      success: true,
      message: 'Recording stopped',
      recording_id,
      filename: recording.filename,
      filepath: recording.filepath,
      file_size: fileSize,
      duration_seconds: duration,
      stopped_at: new Date().toISOString(),
      graceful: exitedGracefully
    });

  } catch (error) {
    console.error('Stop recording error:', error);
    res.status(500).json({ 
      error: 'Failed to stop recording',
      details: error.message 
    });
  }
});

// Get recording status endpoint
app.get('/recording/status/:recording_id', (req, res) => {
  const { recording_id } = req.params;
  const recording = activeRecordings.get(recording_id);

  if (!recording) {
    return res.json({
      recording_id,
      is_recording: false,
      message: 'No active recording found'
    });
  }

  const duration = Math.round((Date.now() - recording.startTime) / 1000);

  res.json({
    recording_id,
    is_recording: true,
    stopping: recording.stopping,
    filename: recording.filename,
    duration_seconds: duration,
    quality: recording.quality,
    motion_triggered: recording.motion_triggered,
    started_at: new Date(recording.startTime).toISOString()
  });
});

// List active recordings
app.get('/recording/active', (req, res) => {
  const active = Array.from(activeRecordings.entries()).map(([id, rec]) => ({
    recording_id: id,
    filename: rec.filename,
    duration_seconds: Math.round((Date.now() - rec.startTime) / 1000),
    quality: rec.quality,
    motion_triggered: rec.motion_triggered,
    stopping: rec.stopping,
    started_at: new Date(rec.startTime).toISOString()
  }));

  res.json({ active_recordings: active, count: active.length });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎥 CamAlert Pi Service running on port ${PORT}`);
  console.log(`📁 Videos will be saved to: /home/pi/Videos`);
  console.log(`🌐 Access at: http://YOUR_PI_IP:${PORT}`);
  if (API_KEY && isApiKeyStrong) {
    console.log(`🔒 Authentication: ENABLED (strong API key configured)`);
  } else if (API_KEY && !isApiKeyStrong) {
    console.error(`⚠️ WARNING: PI_SERVICE_API_KEY is too weak (${API_KEY.length} chars, need ${MIN_API_KEY_LENGTH}+)`);
    console.error(`   Generate a strong key: openssl rand -hex 32`);
    console.error(`   All requests (except /health) will be rejected until fixed.`);
  } else {
    console.error(`❌ CRITICAL: PI_SERVICE_API_KEY not set!`);
    console.error(`   Generate a strong key: openssl rand -hex 32`);
    console.error(`   All requests (except /health) will be rejected until configured.`);
  }
  console.log('\n📋 Available endpoints:');
  console.log(`   GET  /health - Health check (no auth)`);
  console.log(`   POST /upload - Upload recordings`);
  console.log(`   GET  /recordings - List saved recordings`);
  console.log(`   POST /recording/start - Start Pi recording`);
  console.log(`   POST /recording/stop - Stop Pi recording`);
  console.log(`   GET  /recording/status/:id - Get recording status`);
  console.log(`   GET  /recording/active - List active recordings`);
  console.log('\n⚙️  Requirements:');
  console.log(`   - FFmpeg must be installed: sudo apt install ffmpeg`);
  console.log(`   - Generate API key: openssl rand -hex 32`);
  console.log(`   - Set PI_SERVICE_API_KEY env var with the generated key`);
});
