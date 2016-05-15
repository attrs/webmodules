var fs = require('fs-extra');
var path = require('path');
var chalk = require('chalk');
var etag = require('etag');
var fresh = require('fresh');
var serveStatic = require('serve-static');
var finalhandler = require('finalhandler');
var util = require('../util.js');

var isFresh = function(req, etag){
  if( req.headers['if-none-match'] || req.headers['if-modified-since'] ) {
    return fresh({
      'if-modified-since': req.headers['if-modified-since'],
      'if-none-match': req.headers['if-none-match'],
      'last-modified': req.headers['last-modified'],
      'cache-control': req.headers['cache-control']
    }, {
      'etag': etag
    });
  }
  
  return false;
};

var sendManifest = (function() {
  var cache = {}, lastmodified = {};
  
  return function(pkgfile, req, res, next) {
    if( !fs.existsSync(pkgfile) ) return next();
    
    var stat = fs.statSync(pkgfile);
    var tag = etag(stat);
    if( isFresh(req, tag) ) {
      res.statusCode = 304;
      res.end();
    } else {
      var manifest = cache[pkgfile];
      if( !manifest || stat.mtime !== manifest._lastmodified ) {
        manifest = require(pkgfile);
        cache[pkgfile] = manifest;
        var paths = util.extractPaths(path.dirname(pkgfile));
        manifest._directories = paths.directories;
        manifest._files = paths.files;
        manifest._lastmodified = stat.mtime;
      }
      
      res.setHeader('ETag', tag);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write(JSON.stringify(manifest, null, '  '));
      res.end();
    }
  }
})();

var serveModules = function(map) {
  var pkg_router_map = {};
  var pkg_dir_map = {};
  
  if( typeof map === 'string' ) {
    if( fs.existsSync(map) && fs.statSync(map).isDirectory() ) {
      fs.readdirSync(map).forEach(function(filename) {
        var pkgname = filename;
        var pkgdir = path.join(map, pkgname);
        var stat = fs.statSync(pkgdir);
        if( pkgname[0] === '.' || !stat.isDirectory() ) return;
        
        if( pkgname[0] === '@' ) {  // private npm
          fs.readdirSync(pkgdir).forEach(function(_filename) {
            pkgname = pkgname + '/' + _filename;
            pkgdir = path.join(pkgdir, _filename);
            pkg_dir_map[pkgname] = pkgdir;
            pkg_router_map[pkgname] = serveStatic(pkgdir);
          });
        } else {
          pkg_dir_map[pkgname] = pkgdir;
          pkg_router_map[pkgname] = serveStatic(pkgdir);
        }
      });
    }
  } else if( typeof map === 'object' ) {
    Object.keys(map).forEach(function(pkgname) {
      pkg_dir_map[pkgname] = map[pkgname];
      pkg_router_map[pkgname] = serveStatic(map[pkgname]);
    });
  }
  
  return function(req, res, next) {
    if( arguments.length <= 2 ) next = finalhandler(req, res);
    
    var pkgname, subpath, uri = req.url.substring(1);
    if( uri[0] === '@' ) {
      var spos = uri.indexOf('/', uri.indexOf('/') + 1);
      pkgname = ~spos ? uri.substring(0, spos) : uri;
      subpath = uri.substring(pkgname.length);
    } else if( ~uri.indexOf('/') ) {
      pkgname = uri.substring(0, uri.indexOf('/'));
      subpath = uri.substring(pkgname.length);
    }
    
    var pkgrouter = pkg_router_map[pkgname];
    var pkgdir = pkg_dir_map[pkgname];
    var filename = path.basename(req.url);
    
    if( !pkgrouter ) return next();
    if( filename === 'package.json' ) return sendManifest(path.join(pkgdir, subpath), req, res, next);
    
    var _url = req.url;
    req.url = subpath;
    pkgrouter(req, res, next);
    req.url = _url;
  };
};

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
  var rc = fs.existsSync(rcfile) ? JSON.parse(fs.readFileSync(rcfile)) : {};
  var debug = options.debug === true;
  var selfref = options.selfref;
  var links = rc.links || {};
  
  Object.keys(options.links || {}).forEach(function(k) {
    links[k] = options.links[k];
  });
  
  var node_modules_path = options.node_modules || path.join(cwd, 'node_modules');
  var web_modules_path = options.web_modules || rc.directory || path.join(cwd, 'web_modules');
  var runtime_path = path.normalize(path.join(__dirname, '..', '..'));
  
  // self reference mode 일땐, cwd/web_modules & node_modules 를 라우팅하지 않는다.
  var pkg_name = selfref ? require(path.resolve(cwd, 'package.json')).name : path.basename(cwd);
  var selfmap = {};
  selfmap[pkg_name] = cwd;
  
  var serve_self = selfref ? serveModules(selfmap) : function(req, res, next) {next();};
  var serve_runtime = serveModules({ 'webmodules': runtime_path });
  var serve_links = serveModules(links);
  var serve_node_modules = serveModules(node_modules_path);
  var serve_web_modules = serveModules(web_modules_path);
  
  if( debug ) {
    console.log('options', options);
    console.log('cwd', cwd);
    console.log('links', links);
    console.log('pkg_name', pkg_name);
    console.log('runtime_path', runtime_path);
    console.log('node_modules_path', node_modules_path);
    console.log('web_modules_path', web_modules_path);
  }
  
  return function webmodules(req, res, next) {
    if( arguments.length <= 2 ) next = finalhandler(req, res);
    
    serve_runtime(req, res, function(err) {
      if( err ) return next(err);
      serve_links(req, res, function(err) {
        if( err ) return next(err);
        serve_web_modules(req, res, function(err) {
          if( err ) return next(err);
          serve_node_modules(req, res, function(err) {
            if( err ) return next(err);
            serve_self(req, res, next);
          });
        });
      });
    });
  };
};