/* jshint node: true, esversion: 6 */

var http = require('http');
var https = require('https');
var path = require('path');
var fs = require('fs');
var util = require('util');

var request = require('request');
var cookies = require('cookies');
var express = require('express');
var app = express();

var rootDir = path.resolve(__dirname, '..');
var apiKey = process.env.INSTA_API_KEY;
var apiSecret = process.env.INSTA_API_SECRET;
var redirectUri = 'https://visualstupid.now.sh/instagram/login';

var PORT = process.env.DEV_PORT || 80;
var TOKEN = process.env.DEV_TOKEN || '';

var renderIndex = (function () {
  // read the index file and store it in memory, so we render it
  // fast every time
  var indexHtml = fs.readFileSync(path.resolve(rootDir, 'views/index.html'), 'utf8')
    .split('<!--API TOKEN-->');

  return function render(token) {
    return `${indexHtml[0]}
<script>
  var TOKEN = '${token}';
  var CLIENT_ID = '${apiKey}'
  var REDIRECT_URI = encodeURIComponent('${redirectUri}');
</script>
${indexHtml[1]}`;
  };
}());

function writeError(res, message) {
  res.writeHead(580, noCacheHeaders({}));
  res.end(message.toString());
}

function getRootUrl(req) {
  var proto = req.headers['x-forwarded-proto'] || 'http';
  var host = req.headers['x-forwarded-host'] ||
      req.headers.hostname ||
      req.headers.host ||
      `localhost:${PORT}`;

  return `${proto}://${host}`;
}

function noCacheHeaders(headers) {
  return Object.assign({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': 0
  }, headers);
}

function noCache(req, res, next) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  next();
}

app.use(cookies.connect());

app.get('/', noCache, function (req, res) {
  var token = '';

  try {
    token = req.cookies.get('igtoken') || token;
  } catch (e) { }

  res.writeHead(200, {
    'content-type': 'text/html'
  });
  res.end(renderIndex(token || TOKEN));
});

app.get('/instagram/login', function (req, res) {
  var code = req.query.code;

  if (!code) {
    console.log('no login code received', req.query);

    res.writeHead(302, noCacheHeaders({
      location: getRootUrl(req) + '?error=true'
    }));
    res.end();
    return;
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

    var data;

    try {
      data = JSON.parse(body);
    } catch (e) {
      console.error('invalid json returned by Instagram', body);
      return writeError(res, new Error('invalid data returned by Instagram'));
    }

    // redirect back to the root, with cookies
    res.cookies.set('igtoken', data.access_token, {
      httpOnly: true,
      overwrite: true
    });
    res.writeHead(302, noCacheHeaders({
      location: getRootUrl(req)
    }));
    res.end('');
  });
});

// add public file handlers at the end
app.use(express.static(path.resolve(rootDir, 'public')));
app.use(express.static(path.resolve(rootDir, 'build')));

// add error handler
app.use(function (err, req, res, next) {
  console.error('express error:', err);
  res.writeHead(580, 'InternalError');
  res.end();
});

// return a 404 with no body for anything that was not handled already
app.all('*', function (req, res) {
  res.writeHead(404);
  res.end();
});

http.createServer(app).listen(PORT, function () {
  console.log(`listening on port ${PORT} using node ${process.version}`);
});
