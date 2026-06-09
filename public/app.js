document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('dataForm');
  const statusText = document.getElementById('status');
  const downloadArea = document.getElementById('downloadArea');
  const downloadLink = document.getElementById('downloadLink');
  
  const API_URL = '/upload';

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

  // --- HELPER FUNCTION FOR BUTTONS 2 & 3 ---
  // This physically stitches text and binary files together safely
  const buildMultipartBlob = (boundary, username, file, extraMetadata) => {
    const parts = [];

    // Part 1: The Username
    let textPart = `--${boundary}\r\n`;
    textPart += `Content-Disposition: form-data; name="username"\r\n\r\n`;
    textPart += `${username}\r\n`;
    parts.push(new Blob([textPart], { type: 'text/plain' }));

    // Part 2: The File (Only if the user selected one!)
    if (file) {
      let fileHeader = `--${boundary}\r\n`;
      fileHeader += `Content-Disposition: form-data; name="document"; filename="${file.name}"\r\n`;
      fileHeader += `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;
      
      // Push the text headers
      parts.push(new Blob([fileHeader], { type: 'text/plain' }));
      
      // Push the ACTUAL BINARY FILE directly into the array!
      parts.push(file);
      
      // Push the mandatory line break after the file
      parts.push(new Blob(['\r\n'], { type: 'text/plain' }));
    }

    // Part 3: The extra metadata to simulate mixed/related formats
    let metaPart = `--${boundary}\r\n`;
    metaPart += `Content-Disposition: form-data; name="metadata"\r\n`;
    metaPart += `Content-Type: text/plain\r\n\r\n`;
    metaPart += `${extraMetadata}\r\n`;
    metaPart += `--${boundary}--\r\n`; // The closing boundary
    parts.push(new Blob([metaPart], { type: 'text/plain' }));

    // Combine everything into one massive binary payload
    return new Blob(parts);
  };

  // 1. multipart/form-data (Native)
  document.getElementById('btnFormData').addEventListener('click', async () => {
    statusText.innerText = "Sending multipart/form-data...";
    const formData = new FormData(form);
    const res = await fetch(API_URL, { method: 'POST', body: formData });
    logResponse(res);
  });

  // 2. multipart/related (Manual Blob Construction)
  document.getElementById('btnRelated').addEventListener('click', async () => {
    statusText.innerText = "Sending multipart/related...";
    const username = document.getElementById('username').value;
    const file = document.getElementById('document').files[0];
    const boundary = '----RenderBoundary' + Math.random().toString(16).substring(2);
    
    // Call our helper to build the binary payload
    const payloadBlob = buildMultipartBlob(boundary, username, file, "Related metadata");

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: payloadBlob // Send the Blob instead of a string
    });
    logResponse(res);
  });

  // 3. multipart/mixed (Manual Blob Construction)
  document.getElementById('btnMixed').addEventListener('click', async () => {
    statusText.innerText = "Sending multipart/mixed...";
    const username = document.getElementById('username').value;
    const file = document.getElementById('document').files[0];
    const boundary = '----RenderBoundary' + Math.random().toString(16).substring(2);
    
    // Call our helper to build the binary payload
    const payloadBlob = buildMultipartBlob(boundary, username, file, "HTML Data for mixed parts");

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/mixed; boundary=${boundary}` },
      body: payloadBlob // Send the Blob instead of a string
    });
    logResponse(res);
  });

  // 4. application/x-www-form-urlencoded
  document.getElementById('btnUrlEncoded').addEventListener('click', async () => {
    statusText.innerText = "Sending x-www-form-urlencoded...";
    const urlEncodedData = new URLSearchParams();
    urlEncodedData.append('username', document.getElementById('username').value);
    
    const file = document.getElementById('document').files[0];
    if (file) {
      statusText.innerText = "Warning: x-www-form-urlencoded cannot send binary files. Sending text only...";
    }

    const res = await fetch(API_URL, { method: 'POST', body: urlEncodedData });
    logResponse(res);
  });
});
