const http = require('http');

const options = {
    hostname: 'localhost',
    port: 8001,
    path: '/api/processes/4/steps',
    method: 'GET'
};

const req = http.request(options, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        console.log(body);
    });
});

req.on('error', error => {
    console.error(error);
});

req.end();
