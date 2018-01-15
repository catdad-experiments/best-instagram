/* jshint node: true */

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

app.use(express.static(path.resolve(rootDir, 'public')));
app.use(express.static(path.resolve(rootDir, 'build')));

function writeError(res, message) {
  res.writeHead(580);
  res.end(message.toString());
}

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

http.createServer(app).listen(80);
