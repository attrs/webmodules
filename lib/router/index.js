var fs = require('fs-extra');
var path = require('path');
var chalk = require('chalk');
var serveStatic = require('serve-static');
var finalhandler = require('finalhandler');
var util = require('../util.js');

/*
 * options
 *  cwd : string, package root directory, default is process.cwd()
 *  selfref : boolean, self reference (/web_modules/packagename)
 *  moduledir : string, module directory path, (default is {cwd}/web_modules)
 *  validate : boolean, validate _files & _directories fields in each pacakge.json files
 *  rc : rc object
 */
module.exports = function(options) {
  options = options || {};
  
  var cwd = path.resolve(options.cwd || process.cwd());
  var rcfile = path.join(cwd, '.webmodulesrc');
  var rc = options.webmodulesrc || fs.existsSync(rcfile) ? JSON.parse(fs.readFileSync(rcfile)) : {};
  var debug = options.debug === true;
  
  var node_modules_path = path.join(cwd, options.node_modules || 'node_modules');
  var web_modules_path = path.join(cwd, options.web_modules || rc.directory || 'web_modules');
  var runtime_path = path.normalize(path.join(__dirname, '..', '..'));
  
  // self reference mode 일땐, cwd/web_modules & node_modules 를 라우팅하지 않는다.
  var serve_self = options.selfref && serveStatic(cwd);
  var serve_runtime = serveStatic(runtime_path);
  var serve_node_modules = !options.selfref && serveStatic(node_modules_path);
  var serve_web_modules = !options.selfref && serveStatic(web_modules_path);
  var pkg_name = options.selfref ? require(path.resolve(cwd, 'package.json')).name : path.basename(cwd);
  
  if( debug ) {
    console.log('cwd', cwd);
    console.log('selfref', !!options.selfref);
    console.log('pkg_name', pkg_name);
    console.log('runtime_path', runtime_path);
    console.log('node_modules_path', node_modules_path);
    console.log('web_modules_path', web_modules_path);
  }
  
  // write _files & _directory fields.
  
  function extract(root) {
    var map = {};
    
    root = path.resolve(root);
    util.visitSubPackages(root, function(pkg) {
      var manifestfile = path.resolve(pkg.directory, 'package.json');
      //var relpath = path.relative(root, manifestfile);
      //console.log('visit', manifestfile);
      if( fs.existsSync(manifestfile) ) {
        var manifest = require(manifestfile);
        var paths = util.extractPaths(pkg.directory);
        manifest._directories = paths.directories;
        manifest._files = paths.files;
      
        map[manifestfile] = manifest;
      }
    });
    
    return map;
  };
  
  var cwd_manifestmap = extract(cwd);
  var runtime_manifestmap = extract(runtime_path);
  
  return function webmodules(req, res, next) {
    if( arguments.length <= 2 ) next = finalhandler(req, res);
    
    //console.log('req', req.url);
    if( serve_self && req.url.startsWith('/' + pkg_name + '/') ) {
      req.url = req.url.substring(('/' + pkg_name + '/').length);
      serve_self(req, res, next);
    } else if( serve_runtime && req.url.startsWith('/webmodules/') ) {
      req.url = req.url.substring('/webmodules/'.length);
      
      if( req.url.endsWith('/package.json') ) {
        if( debug ) console.log('[webmodules] runtime package.json', req.url);
        var manifest = runtime_manifestmap[path.join(runtime_path, req.url)];
        if( manifest ) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.write(JSON.stringify(manifest, null, '  '));
          res.end();
        }
        
        return next();
      }
      
      serve_runtime(req, res, next);
    } else if( serve_web_modules ) {
      if( req.url.endsWith('/package.json') ) {
        if( debug ) console.log('[webmodules] cwd package.json', req.url);
        var manifest = cwd_manifestmap[path.join(web_modules_path, req.url)]
                      || cwd_manifestmap[path.join(node_modules_path, req.url)];
        if( manifest ) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.write(JSON.stringify(manifest, null, '  '));
          res.end();
        }
      
        return next();
      }
      
      serve_web_modules(req, res, function() {
        serve_node_modules(req, res, next);
      });
    } else {
      next();
    }
  };
};