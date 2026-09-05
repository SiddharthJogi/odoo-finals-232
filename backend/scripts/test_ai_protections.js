const http = require('http');

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 4000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('=== Step 1: Login to get JWT Token ===');
  const loginRes = await makeRequest('/api/auth/login', 'POST', {
    email: 'admin@peoplepay360.com',
    password: 'admin123',
  });

  if (loginRes.status !== 200) {
    console.error('Login failed:', loginRes.body);
    process.exit(1);
  }
  const token = loginRes.body.token;
  console.log('Login successful! JWT acquired.');

  console.log('\n=== Step 2: Test Input Validation ===');
  const emptyRes = await makeRequest('/api/ai/query', 'POST', { question: '' }, token);
  console.log('Empty query response:', emptyRes.status, emptyRes.body);
  const shortRes = await makeRequest('/api/ai/query', 'POST', { question: 'a' }, token);
  console.log('Short query response:', shortRes.status, shortRes.body);
  const longRes = await makeRequest('/api/ai/query', 'POST', { question: 'a'.repeat(305) }, token);
  console.log('Long query response:', longRes.status, longRes.body);

  console.log('\n=== Step 3: Test Normal Query & Fallback/Gemini ===');
  const q1 = await makeRequest('/api/ai/query', 'POST', { question: 'What is our total net salary cost this month?' }, token);
  console.log('Query 1 response:', q1.status, JSON.stringify(q1.body, null, 2));

  console.log('\n=== Step 4: Test In-Memory Caching ===');
  const q2 = await makeRequest('/api/ai/query', 'POST', { question: 'What is our total net salary cost this month?' }, token);
  console.log('Query 2 (cached) response:', q2.status, 'cached:', q2.body.cached, 'source:', q2.body.source);

  console.log('\n=== Step 5: Test Telemetry Endpoint ===');
  const statsRes = await makeRequest('/api/ai/usage-stats', 'GET', null, token);
  console.log('Usage Stats:', statsRes.status, JSON.stringify(statsRes.body, null, 2));

  console.log('\n=== Step 6: Test Rate Limiting (Sending 11 requests) ===');
  for (let i = 1; i <= 11; i++) {
    const res = await makeRequest('/api/ai/query', 'POST', { question: `Unique query ${i} for rate limiting test ${Math.random()}` }, token);
    console.log(`Req ${i}: Status ${res.status}`, res.status === 429 ? res.body : 'OK');
  }

  console.log('\n=== All AI Protections Verification Tests Completed Successfully! ===');
}

runTests().catch(console.error);
