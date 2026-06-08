const express = require('express');
const busboy = require('busboy');
const path = require('path');
const fs = require('fs'); 

const app = express();

// 1. Setup uploads directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 2. Serve frontend files & handle URL-encoded data natively
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// 3. Upload Route
app.post('/upload', (req, res) => {
  const contentType = req.headers['content-type'] || '';

  // Format: x-www-form-urlencoded
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return res.json({ status: 'Success', format: 'x-www-form-urlencoded', data: req.body });
  }

  // Formats: multipart/form-data, multipart/related, multipart/mixed
  if (contentType.includes('multipart/')) {
    const multipartType = contentType.split(';')[0]; 
    const bb = busboy({ headers: req.headers });
    
    let fields = {};
    let savedFilename = null;

    // Catch text data
    bb.on('field', (name, val) => { fields[name] = val; });
    
    // Catch and save files
    bb.on('file', (name, file, info) => {
      if (info.filename) {
        savedFilename = info.filename;
        const savePath = path.join(uploadDir, savedFilename);
        file.pipe(fs.createWriteStream(savePath));
      } else {
        file.resume(); 
      }
    });

    // Send success response with download link info
    bb.on('close', () => {
      return res.json({ 
        status: 'Success', 
        format: multipartType, 
        data: fields,
        fileAvailableForDownload: savedFilename
      });
    });

    bb.on('error', (err) => res.status(400).json({ error: 'Failed', details: err.message }));

    req.pipe(bb);
  } else {
    res.status(400).json({ error: 'Unsupported Content-Type' });
  }
});

// 4. Download Route
app.get('/download/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath); 
  } else {
    res.status(404).send('File not found!');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App running on port ${PORT}`));
