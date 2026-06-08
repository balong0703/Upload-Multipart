document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('dataForm');
  const statusText = document.getElementById('status');
  const downloadArea = document.getElementById('downloadArea');
  const downloadLink = document.getElementById('downloadLink');
  
  const API_URL = '/upload';

  // Helper to log JSON and show download button
  const logResponse = async (res) => {
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
      statusText.innerText = "Error parsing server response.";
      downloadArea.style.display = 'none';
    }
  };

  // 1. multipart/form-data
  document.getElementById('btnFormData').addEventListener('click', async () => {
    statusText.innerText = "Sending multipart/form-data...";
    const formData = new FormData(form);
    const res = await fetch(API_URL, { method: 'POST', body: formData });
    logResponse(res);
  });

  // 4. application/x-www-form-urlencoded
  document.getElementById('btnUrlEncoded').addEventListener('click', async () => {
    statusText.innerText = "Sending x-www-form-urlencoded...";
    const urlEncodedData = new URLSearchParams();
    urlEncodedData.append('username', document.getElementById('username').value);
    
    const res = await fetch(API_URL, { method: 'POST', body: urlEncodedData });
    logResponse(res);
  });

  // 2. multipart/related
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

  // 3. multipart/mixed
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
