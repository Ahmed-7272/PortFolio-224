// Simple API proxy to handle OpenAI requests server-side
// This keeps the API key secure and avoids CORS issues

const http = require('http');
const https = require('https');
const url = require('url');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = 3001;

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/api/generate') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const requestData = JSON.parse(body);
                
                if (!OPENAI_API_KEY) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'OpenAI API key not configured' }));
                    return;
                }

                // Forward request to OpenAI
                const openaiData = JSON.stringify({
                    model: 'gpt-4o',
                    messages: requestData.messages,
                    max_tokens: 2000,
                    temperature: 0.7
                });

                const options = {
                    hostname: 'api.openai.com',
                    port: 443,
                    path: '/v1/chat/completions',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        'Content-Length': Buffer.byteLength(openaiData)
                    }
                };

                const openaiReq = https.request(options, (openaiRes) => {
                    let responseBody = '';

                    openaiRes.on('data', chunk => {
                        responseBody += chunk;
                    });

                    openaiRes.on('end', () => {
                        res.writeHead(openaiRes.statusCode, { 'Content-Type': 'application/json' });
                        res.end(responseBody);
                    });
                });

                openaiReq.on('error', (error) => {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to connect to OpenAI' }));
                });

                openaiReq.write(openaiData);
                openaiReq.end();

            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid request format' }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
});