var fs = require('fs-extra');
var path = require('path');
var serveStatic = require('serve-static');
var finalhandler = require('finalhandler');
var util = require('../util.js');

module.exports = function(options) {
  options = options || {};
  
  var rcfile = path.join(options.cwd || process.cwd(), '.webmodulesrc');
  var rc = fs.existsSync(rcfile) ? JSON.parse(fs.readFileSync(rcfile)) : {};
  var base = path.join(process.cwd(), options.base || rc.directory || 'web_modules');
  
  var runtimedir = serveStatic(path.normalize(path.join(__dirname, '..', '..')));
  var moduledir = serveStatic(base);
  
  return function webmodules(req, res, next) {
    if( arguments.length <= 2 ) next = finalhandler(req, res);
    
    //console.log('req', req.url);
    if( req.url.startsWith('/webmodules/') ) {
      req.url = req.url.substring('/webmodules/'.length);
      runtimedir(req, res, next);
    } else {
      moduledir(req, res, next);
    }
  };
};