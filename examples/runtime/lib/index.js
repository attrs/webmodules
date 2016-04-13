var http = require('http');
var express = require('express');
var webmodules = require('../../../');
var PORT = 9000;

var app = express()
  .use('/test', express.static('public'))
  .use('/web_modules', webmodules.router());

http.createServer(app).listen({
  port: PORT
}, function() {
  console.log('httpd listening on %s', PORT);
});

//console.log(require('../node_modules/express/lib/request.js'));