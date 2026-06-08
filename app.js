document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('vanillaForm');
  const statusText = document.getElementById('status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Stop the browser from navigating away

    // FormData automatically reads all inputs with a 'name' attribute
    const formData = new FormData(form);
    
    statusText.innerText = "Sending data...";

    try {
      // Send the request to your backend
      const response = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData 
        // Note: The browser natively calculates the boundaries and sets the 
        // Content-Type to 'multipart/form-data; boundary=---...' automatically.
      });

      if (response.ok) {
        const result = await response.json();
        statusText.innerText = "Success! Server says: " + result.message;
        form.reset();
      } else {
        statusText.innerText = "Server rejected the request.";
      }
    } catch (error) {
      console.error(error);
      statusText.innerText = "Network error. Is the server running?";
    }
  });
});
