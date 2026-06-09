document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('dataForm');
  const statusText = document.getElementById('status');
  const downloadArea = document.getElementById('downloadArea');
  const downloadLink = document.getElementById('downloadLink');
  
  const API_URL = '/upload';

  // 1. Handle Server-Side Errors (Bad Responses)
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

  // 2. NEW: Handle Client-Side Errors (Network failures, server offline)
  const safeFetch = async (url, options) => {
    try {
      const res = await fetch(url, options);
      await logResponse(res);
    } catch (error) {
      // If the server is down or rebooting, this catches it!
      statusText.innerText = `Network Error: ${error.message}\n\nThe server might be offline, restarting, or rejecting the connection. Wait a minute and try again.`;
      downloadArea.style.display = 'none';
    }
  };

  // --- HELPER FUNCTION FOR BUTTONS 2 & 3 ---
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
});
