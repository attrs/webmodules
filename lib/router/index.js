var fs = require('fs-extra');
var path = require('path');
var serveStatic = require('serve-static');
var finalhandler = require('finalhandler')

module.exports = function(req, res, next) {
  if( arguments.length <= 2 ) next = finalhandler(req, res);
  
  next();
};