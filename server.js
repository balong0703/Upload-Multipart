const express = require('express');
const busboy = require('busboy');
const path = require('path');
const fs = require('fs'); 

const app = express();

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.post('/upload', (req, res) => {
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return res.json({ status: 'Success', format: 'x-www-form-urlencoded', data: req.body });
  }

  if (contentType.includes('multipart/')) {
    try {
      const multipartType = contentType.split(';')[0]; 
      const bb = busboy({ headers: req.headers });
      
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

      // Catch streaming errors safely
      bb.on('error', (err) => {
        console.error("Busboy Stream Error:", err);
        // Ensure we don't send multiple responses if it already crashed
        if (!res.headersSent) {
          return res.status(400).json({ error: 'Multipart parsing failed', details: err.message });
        }
      });

      req.pipe(bb);
      
    } catch (error) {
      // THIS CATCHES THE FATAL CRASH!
      console.error("Fatal Busboy Error:", error);
      return res.status(500).json({ 
        error: 'Backend crashed while setting up the parser', 
        details: error.message 
      });
    }
  } else {
    res.status(400).json({ error: 'Unsupported Content-Type' });
  }
});

app.get('/download/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath); 
  } else {
    res.status(404).send('File not found!');
  }
});

// NEW: Global Express Error Handler
// If anything else crashes, send this JSON instead of the HTML page
app.use((err, req, res, next) => {
  console.error("Global Express Error:", err);
  res.status(500).json({ error: "Internal Server Error", details: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App running on port ${PORT}`));
