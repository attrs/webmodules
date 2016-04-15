var http = require('http');
var express = require('express');
var webmodules = require('../../../');

express()
  .use('/', express.static('public'))
  .use('/web_modules', webmodules.router())
  .listen(9000, function () {
    console.log('httpd listening on port 9000');
  });
  