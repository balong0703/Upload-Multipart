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
      
      // --- THE FIX ---
      // Clone the headers and rewrite the content-type to trick Busboy
      // into accepting our custom mixed/related formats.
      const modifiedHeaders = { ...req.headers };
      modifiedHeaders['content-type'] = modifiedHeaders['content-type']
        .replace('multipart/related', 'multipart/form-data')
        .replace('multipart/mixed', 'multipart/form-data');

      // Initialize Busboy with our modified headers
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
          format: multipartType, // We still reply with the original format name
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

app.use((err, req, res, next) => {
  console.error("Global Express Error:", err);
  res.status(500).json({ error: "Internal Server Error", details: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App running on port ${PORT}`));
