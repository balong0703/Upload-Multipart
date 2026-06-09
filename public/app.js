document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('dataForm');
  const statusText = document.getElementById('status');
  const downloadArea = document.getElementById('downloadArea');
  const downloadLink = document.getElementById('downloadLink');
  
  const API_URL = '/upload';

  // --- Network Helpers ---
  const logResponse = async (res) => {
    const resClone = res.clone(); 
    try {
      const data = await res.json();
      statusText.innerText = JSON.stringify(data, null, 2);

      if (data.fileAvailableForDownload) {
        downloadLink.href = `/download/${data.fileAvailableForDownload}`;
        downloadArea.style.display = 'inline-block';
      } else {
        downloadArea.style.display = 'none';
      }
    } catch {
      const rawText = await resClone.text();
      statusText.innerText = `Server Error (Non-JSON response):\n${rawText}`;
      downloadArea.style.display = 'none';
    }
  };

  const safeFetch = async (url, options) => {
    try {
      const res = await fetch(url, options);
      await logResponse(res);
    } catch (error) {
      statusText.innerText = `Network Error: ${error.message}\n\nThe server might be offline or restarting.`;
      downloadArea.style.display = 'none';
    }
  };

  const buildMultipartBlob = (boundary, username, file, extraMetadata) => {
    const parts = [];

    let textPart = `--${boundary}\r\n`;
    textPart += `Content-Disposition: form-data; name="username"\r\n\r\n`;
    textPart += `${username}\r\n`;
    parts.push(new Blob([textPart], { type: 'text/plain' }));

    if (file) {
      let fileHeader = `--${boundary}\r\n`;
      fileHeader += `Content-Disposition: form-data; name="document"; filename="${file.name}"\r\n`;
      fileHeader += `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;
      parts.push(new Blob([fileHeader], { type: 'text/plain' }));
      parts.push(file);
      parts.push(new Blob(['\r\n'], { type: 'text/plain' }));
    }

    let metaPart = `--${boundary}\r\n`;
    metaPart += `Content-Disposition: form-data; name="metadata"\r\n`;
    metaPart += `Content-Type: text/plain\r\n\r\n`;
    metaPart += `${extraMetadata}\r\n`;
    metaPart += `--${boundary}--\r\n`;
    parts.push(new Blob([metaPart], { type: 'text/plain' }));

    return new Blob(parts);
  };

  // --- Button Listeners ---

  // 1. multipart/form-data
  document.getElementById('btnFormData').addEventListener('click', async () => {
    statusText.innerText = "Sending multipart/form-data...";
    const formData = new FormData(form);
    await safeFetch(API_URL, { method: 'POST', body: formData });
  });

  // 2. multipart/related
  document.getElementById('btnRelated').addEventListener('click', async () => {
    statusText.innerText = "Sending multipart/related...";
    const username = document.getElementById('username').value;
    const file = document.getElementById('document').files[0];
    const boundary = '----RenderBoundary' + Math.random().toString(16).substring(2);
    
    const payloadBlob = buildMultipartBlob(boundary, username, file, "Related metadata");
    await safeFetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: payloadBlob 
    });
  });

  // 3. multipart/mixed
  document.getElementById('btnMixed').addEventListener('click', async () => {
    statusText.innerText = "Sending multipart/mixed...";
    const username = document.getElementById('username').value;
    const file = document.getElementById('document').files[0];
    const boundary = '----RenderBoundary' + Math.random().toString(16).substring(2);
    
    const payloadBlob = buildMultipartBlob(boundary, username, file, "HTML Data for mixed parts");
    await safeFetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/mixed; boundary=${boundary}` },
      body: payloadBlob
    });
  });

  // 4. application/x-www-form-urlencoded
  document.getElementById('btnUrlEncoded').addEventListener('click', async () => {
    statusText.innerText = "Sending x-www-form-urlencoded...";
    const urlEncodedData = new URLSearchParams();
    urlEncodedData.append('username', document.getElementById('username').value);
    
    const file = document.getElementById('document').files[0];
    if (file) {
      statusText.innerText += "\n(Warning: x-www-form-urlencoded ignores files. Sending text only...)";
    }
    await safeFetch(API_URL, { method: 'POST', body: urlEncodedData });
  });

  // 5. application/octet-stream (Raw Binary Streaming)
  document.getElementById('btnRawBinary').addEventListener('click', async () => {
    const file = document.getElementById('document').files[0];
    const username = document.getElementById('username').value;

    if (!file) {
      statusText.innerText = "Error: You must choose a file to send as raw binary!";
      return;
    }

    statusText.innerText = `Streaming raw binary bytes of ${file.name} to the server...`;

    await safeFetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/octet-stream',
        'X-Username': username,
        'X-Filename': file.name
      },
      // Pass the File object directly. The browser natively streams the binary!
      body: file 
    });
  });

  // 6. text/quoted-printable
  document.getElementById('btnQuotedPrintable').addEventListener('click', async () => {
    statusText.innerText = "Encoding text as Quoted-Printable...";
    const username = document.getElementById('username').value;
    const rawMessage = `Hello ${username}! Special chars: Equals (=), Tab (\t), and Emoji (🔥)`;

    const qpEncoded = rawMessage.replace(/[^\x20-\x3C\x3E-\x7E]/g, (char) => {
      return '=' + char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
    });

    await safeFetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/quoted-printable' },
      body: qpEncoded
    });
  });
});
