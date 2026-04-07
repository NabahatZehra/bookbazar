import http from 'http';

const data = JSON.stringify({
  name: "Ali",
  email: "ali124@gmail.com",
  password: "password123"
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, res => {
  let body = '';
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', d => {
    body += d;
  });
  res.on('end', () => {
    console.log(`BODY: ${body}`);
  });
});

req.on('error', error => {
  console.error(`ERROR: ${error.message}`);
});

req.write(data);
req.end();
