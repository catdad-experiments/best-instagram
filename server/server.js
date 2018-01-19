/* jshint node: true, esversion: 6 */

var http = require('http');
var https = require('https');
var path = require('path');
var fs = require('fs');
var util = require('util');

var request = require('request');
var express = require('express');
var app = express();

var rootDir = path.resolve(__dirname, '..');
var apiKey = process.env.INSTA_API_KEY;
var apiSecret = process.env.INSTA_API_SECRET;
var redirectUri = 'https://visualstupid.now.sh/instagram/login';

var indexHtml = fs.readFileSync(path.resolve(rootDir, 'views/index.html'), 'utf8')
  .split('<!--API TOKEN-->');

var PORT = process.env.DEV_PORT || 80;
var TOKEN = process.env.DEV_TOKEN || '';

function render(token) {
  return `${indexHtml[0]}<script>var TOKEN="${token}";</script>${indexHtml[1]}`;
}

function writeError(res, message) {
  res.writeHead(580);
  res.end(message.toString());
}

app.get('/', function (req, res) {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(render(TOKEN));
});

app.get('/instagram/login', function (req, res) {
  var code = req.query.code;

  if (!code) {
    return writeError(res, 'Error: no code received in redirect\n' + JSON.stringify(req.query));
  }

  var form = {
    client_id: apiKey,
    client_secret: apiSecret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code: code
  };

  request({
    method: 'POST',
    url: 'https://api.instagram.com/oauth/access_token',
    form: form
  }, function (err, response, body) {
    if (err) {
      return writeError(res, err.toString());
    }

    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<html><body>' + JSON.stringify(JSON.parse(body), null, 2) + '</body></html>');
  });
});

// add public file handlers at the end
app.use(express.static(path.resolve(rootDir, 'public')));
app.use(express.static(path.resolve(rootDir, 'build')));

http.createServer(app).listen(PORT, function () {
  console.log(`listening on port ${PORT} using node ${process.version}`);
});
