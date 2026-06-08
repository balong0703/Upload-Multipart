const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  // 1. Handle CORS so the browser allows the request
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Pre-flight request handler for CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // 2. Handle the POST request
  if (req.method === 'POST' && req.url === '/upload') {
    const contentType = req.headers['content-type'] || '';
    
    if (!contentType.includes('multipart/form-data')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: "Data must be multipart/form-data" }));
    }

    let bodyChunks = [];

    // As data streams in, push chunks into an array
    req.on('data', chunk => {
      bodyChunks.push(chunk);
    });

    // When the stream finishes, combine the chunks into a single Buffer
    req.on('end', () => {
      const rawBuffer = Buffer.concat(bodyChunks);
      
      // In a pure vanilla environment, you must now manually parse this rawBuffer 
      // by splitting it using the boundary found in the contentType variable.
      // For demonstration, we will just save the raw multipart payload to disk:
      fs.writeFileSync('raw-upload-data.txt', rawBuffer);

      console.log('Received raw multipart data of length:', rawBuffer.length);

      // Send success response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: "Raw data received and logged to disk!" }));
    });

  } else {
    // 404 for any other route
    res.writeHead(404);
    res.end();
  }
});

server.listen(3000, () => {
  console.log('Vanilla Node server running at http://localhost:3000');
});
