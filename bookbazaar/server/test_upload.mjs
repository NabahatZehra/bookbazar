import fs from 'fs';
import path from 'path';

// We'll write a simple test text file
fs.writeFileSync('test_image.jpg', 'fake image content haha');

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

let body = '';
body += '--' + boundary + '\r\n';
body += 'Content-Disposition: form-data; name="title"\r\n\r\n';
body += 'Test Book\r\n';
body += '--' + boundary + '\r\n';
body += 'Content-Disposition: form-data; name="author"\r\n\r\n';
body += 'Test Author\r\n';
body += '--' + boundary + '\r\n';
body += 'Content-Disposition: form-data; name="price"\r\n\r\n';
body += '100\r\n';
body += '--' + boundary + '\r\n';
body += 'Content-Disposition: form-data; name="description"\r\n\r\n';
body += 'Testing upload\r\n';
body += '--' + boundary + '\r\n';
body += 'Content-Disposition: form-data; name="condition"\r\n\r\n';
body += 'Good\r\n';
body += '--' + boundary + '\r\n';
body += 'Content-Disposition: form-data; name="image"; filename="test_image.jpg"\r\n';
body += 'Content-Type: image/jpeg\r\n\r\n';
body += fs.readFileSync('test_image.jpg') + '\r\n';
body += '--' + boundary + '--\r\n';

// 1. First register to get a token
const registerData = JSON.stringify({
  name: "Uploader",
  email: "upload" + Date.now() + "@gmail.com",
  password: "password123"
});

fetch('http://localhost:5000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: registerData
})
.then(res => res.json())
.then(data => {
  const token = data.data.accessToken;
  console.log("Got token!", !!token);
  
  // 2. Now upload the book
  return fetch('http://localhost:5000/api/books', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'multipart/form-data; boundary=' + boundary
    },
    body: body
  });
})
.then(res => {
  console.log("UPLOAD STATUS:", res.status);
  return res.text();
})
.then(text => {
  console.log("UPLOAD RESPONSE:", text);
})
.catch(err => {
  console.error("FATAL ERROR:", err.message);
});
