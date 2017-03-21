var http = require('http');
var fs = require('fs');
var path = require('path');
var serveStatic = require('serve-static');
var staticFile = require('connect-static-file');
var finalhandler = require('finalhandler');
var router = require('../router');

var httpd;

module.exports = function up(options, done) {
  if( !options ) return done(new Error('missing options'));
  if( typeof options.port !== 'number' ) return done(new Error('port number must be a number'));
  if( options.port < 0 || isNaN(options.port) || options.port > 65535 ) return done(new Error('illegal port number:' + options.port));
  
  var cwd = options.cwd || process.cwd();
  var docbase = path.resolve(cwd, options.docbase || '.');
  var defpage = typeof options.defpage === 'string' ? path.resolve(cwd, options.defpage) : null;
  var host = options.host || '0.0.0.0';
  var port = options.port || 9000;
  
  if( defpage && !fs.existsSync(defpage) && !fs.statSync(defpage).isFile )
    return done(new Error('default page "' + defpage + '" must be a file'));
  
  var serve_docbase = serveStatic(docbase);
  var serve_defpage = defpage ? staticFile(defpage) : null;
  var serve_webmodules = router({
    cwd: cwd,
    selfref: options.selfref
  });
  
  httpd = http.createServer(function(req, res){
    var next = finalhandler(req, res);
    
    if( req.url.startsWith('/web_modules/') ) {
      req.url = req.url.substring('/web_modules'.length);
      serve_webmodules(req, res, next);
    } else if( req.url.startsWith('/node_modules/') ) {
      req.url = req.url.substring('/node_modules'.length);
      serve_webmodules(req, res, next);
    } else {
      serve_docbase(req, res, function(err) {
        if( err ) return next(err);
        if( serve_defpage ) serve_defpage(req, res, next);
        else next();
      });
    }
  })
  .on('error', function(err) {
    done(err);
  }).listen({
    host: host,
    port: port
  }, function() {
    done(null, {
      httpd: httpd,
      address: httpd.address(),
      docbase: docbase
    });
  });
};