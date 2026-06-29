const http = require('http');

const data = JSON.stringify({
    partId: 33,
    stepId: 13,
    employeeId: null
});

const options = {
    hostname: 'localhost',
    port: 8001,
    path: '/api/step-instances/start',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        require('fs').writeFileSync('response.json', body);
        console.log('Response saved to response.json');
    });
});

req.on('error', error => {
    console.error(error);
});

req.write(data);
req.end();
