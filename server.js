const express = require('express');
const busboy = require('busboy');
const path = require('path');
const fs = require('fs');

const app = express();

// Create an uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 1. Serve frontend files
app.use(express.static(path.join(__dirname, 'public')));

// 2. Native Express middleware for URL-encoded data
app.use(express.urlencoded({ extended: true }));

// 3. Native Express middleware to catch Quoted-Printable as text
app.use(express.text({ type: 'text/quoted-printable', limit: '10mb' }));

// 4. NEW: Native Express middleware to catch Raw Binary streams as a Buffer
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

// --- MAIN UPLOAD ROUTE ---
app.post('/upload', (req, res) => {
  const contentType = req.headers['content-type'] || '';

  // Format 4: URL-Encoded
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return res.json({ status: 'Success', format: 'x-www-form-urlencoded', data: req.body });
  }

  // Format 5: Raw Binary File Streaming (Real-World Standard)
  if (contentType.includes('application/octet-stream')) {
    if (Buffer.isBuffer(req.body)) {
      try {
        const filename = req.headers['x-filename'] || 'raw-upload.bin';
        const username = req.headers['x-username'] || 'Unknown';
        
        const savePath = path.join(uploadDir, filename);
        fs.writeFileSync(savePath, req.body); // Directly save the raw binary bytes

        return res.json({ 
          status: 'Success', 
          format: 'application/octet-stream', 
          data: { username: username, bytesReceived: req.body.length },
          fileAvailableForDownload: filename
        });
      } catch (err) {
        return res.status(500).json({ error: 'Raw Binary Save Failed', details: err.message });
      }
    } else {
      return res.status(400).json({ error: 'Expected raw binary buffer' });
    }
  }

  // Format 6: Quoted-Printable Text Encoding
  if (contentType.includes('text/quoted-printable')) {
    const decodedText = req.body.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });

    return res.json({ 
      status: 'Success', 
      format: 'text/quoted-printable', 
      data: { 
        rawPayloadReceived: req.body,
        decodedMessage: decodedText 
      } 
    });
  }

  // Formats 1, 2, 3: Multipart Forms
  if (contentType.includes('multipart/')) {
    try {
      const multipartType = contentType.split(';')[0]; 
      
      // Trick Busboy into parsing mixed/related boundaries by renaming the header
      const modifiedHeaders = { ...req.headers };
      modifiedHeaders['content-type'] = modifiedHeaders['content-type']
        .replace('multipart/related', 'multipart/form-data')
        .replace('multipart/mixed', 'multipart/form-data');

      const bb = busboy({ headers: modifiedHeaders });
      let fields = {};
      let savedFilename = null;

      bb.on('field', (name, val) => { fields[name] = val; });
      
      bb.on('file', (name, file, info) => {
        if (info.filename) {
          savedFilename = info.filename;
          const savePath = path.join(uploadDir, savedFilename);
          file.pipe(fs.createWriteStream(savePath));
        } else {
          file.resume(); 
        }
      });

      bb.on('close', () => {
        return res.json({ 
          status: 'Success', 
          format: multipartType, 
          data: fields,
          fileAvailableForDownload: savedFilename
        });
      });

      bb.on('error', (err) => {
        console.error("Busboy Stream Error:", err);
        if (!res.headersSent) {
          return res.status(400).json({ error: 'Multipart parsing failed', details: err.message });
        }
      });

      req.pipe(bb);
      
    } catch (error) {
      console.error("Fatal Busboy Error:", error);
      return res.status(500).json({ 
        error: 'Backend crashed while setting up the parser', 
        details: error.message 
      });
    }
  } else {
    // Failsafe for anything else
    if (!res.headersSent) res.status(400).json({ error: 'Unsupported Content-Type' });
  }
});

// --- DOWNLOAD ROUTE ---
app.get('/download/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath); 
  } else {
    res.status(404).send('File not found!');
  }
});

// Global Express Error Handler
app.use((err, req, res, next) => {
  console.error("Global Express Error:", err);
  res.status(500).json({ error: "Internal Server Error", details: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App running on port ${PORT}`));
