const http = require('http');

const data = JSON.stringify({
    partId: 33,
    stepId: 1,
    employeeId: 1
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
        console.log(body);
    });
});

req.on('error', error => {
    console.error(error);
});

req.write(data);
req.end();
