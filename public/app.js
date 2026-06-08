document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('dataForm');
  const statusText = document.getElementById('status');
  const downloadArea = document.getElementById('downloadArea');
  const downloadLink = document.getElementById('downloadLink');
  
  // Using a relative path so it automatically routes to your Render backend
  const API_URL = '/upload';

  // Helper to log JSON, show download button, and catch raw text errors
  const logResponse = async (res) => {
    // Clone the response so we can read it as text if JSON parsing fails
    const resClone = res.clone(); 
    
    try {
      const data = await res.json();
      statusText.innerText = JSON.stringify(data, null, 2);

      // Show download link if the server saved a file
      if (data.fileAvailableForDownload) {
        downloadLink.href = `/download/${data.fileAvailableForDownload}`;
        downloadArea.style.display = 'inline-block';
      } else {
        downloadArea.style.display = 'none';
      }
    } catch {
      // If JSON parsing fails, read the raw text to see the actual server error
      const rawText = await resClone.text();
      statusText.innerText = `Server Error (Non-JSON response):\n${rawText}`;
      downloadArea.style.display = 'none';
    }
  };

  // 1. multipart/form-data (Sends text AND files natively)
  document.getElementById('btnFormData').addEventListener('click', async () => {
    statusText.innerText = "Sending multipart/form-data...";
    const formData = new FormData(form);
    const res = await fetch(API_URL, { method: 'POST', body: formData });
    logResponse(res);
  });

  // 4. application/x-www-form-urlencoded (Sends text only)
  document.getElementById('btnUrlEncoded').addEventListener('click', async () => {
    statusText.innerText = "Sending x-www-form-urlencoded...";
    const urlEncodedData = new URLSearchParams();
    urlEncodedData.append('username', document.getElementById('username').value);
    
    const res = await fetch(API_URL, { method: 'POST', body: urlEncodedData });
    logResponse(res);
  });

  // 2. multipart/related (Sends custom text/metadata payload)
  document.getElementById('btnRelated').addEventListener('click', async () => {
    statusText.innerText = "Sending multipart/related...";
    const username = document.getElementById('username').value;
    const boundary = '----RenderBoundary' + Math.random().toString(16).substring(2);
    
    let bodyPayload = `--${boundary}\r\n`;
    bodyPayload += `Content-Disposition: form-data; name="username"\r\n\r\n`;
    bodyPayload += `${username}\r\n`;
    bodyPayload += `--${boundary}\r\n`;
    bodyPayload += `Content-Type: text/plain\r\n\r\n`;
    bodyPayload += `Metadata for related parts.\r\n`;
    bodyPayload += `--${boundary}--`;

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: bodyPayload
    });
    logResponse(res);
  });

  // 3. multipart/mixed (Sends custom text/HTML payload)
  document.getElementById('btnMixed').addEventListener('click', async () => {
    statusText.innerText = "Sending multipart/mixed...";
    const username = document.getElementById('username').value;
    const boundary = '----RenderBoundary' + Math.random().toString(16).substring(2);
    
    let bodyPayload = `--${boundary}\r\n`;
    bodyPayload += `Content-Disposition: form-data; name="username"\r\n\r\n`;
    bodyPayload += `${username}\r\n`;
    bodyPayload += `--${boundary}\r\n`;
    bodyPayload += `Content-Type: text/html\r\n\r\n`;
    bodyPayload += `<h1>HTML Data for mixed parts</h1>\r\n`;
    bodyPayload += `--${boundary}--`;

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/mixed; boundary=${boundary}` },
      body: bodyPayload
    });
    logResponse(res);
  });
});
