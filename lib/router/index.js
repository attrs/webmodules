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
  
  var cwd = options.cwd || process.cwd();
  var rcfile = path.join(cwd, '.webmodulesrc');
  var rc = options.webmodulesrc || fs.existsSync(rcfile) ? JSON.parse(fs.readFileSync(rcfile)) : {};
  var moduledirpath = path.join(process.cwd(), options.moduledir || rc.directory || 'web_modules');
  var runtimedirpath = path.normalize(path.join(__dirname, '..', '..'));
  
  var pkg;
  try {
    var pkgfile = path.resolve(cwd, 'package.json');
    pkg = fs.existsSync(pkgfile) ? require(pkgfile) : null;
  } catch(err) {
    if( options.selfref ) console.log('[WARN] selfref error: file not found:' + pkgfile);
  }
  
  var selfdir = pkg && options.selfref && serveStatic(cwd);
  var runtimedir = serveStatic(runtimedirpath);
  var moduledir = serveStatic(moduledirpath);
  
  //console.log('cwd', cwd);
  //console.log('runtimedir', runtimedirpath);
  //console.log('moduledir', moduledirpath);
  //console.log('pkg.name', pkg && pkg.name);
  
  // self reference mode 일땐, moduledir(cwd/web_modules) 을 라우팅하지 않는다.
  if( options.selfref ) moduledir = null;
  
  // write _files & _directory fields.
  if( options.validate !== false ) {
    (function() {
      var wmpkgdir = path.join(__dirname, '..', '..');
      var wmpkgfile = path.join(wmpkgdir, 'package.json');
      /*var wmmanifest = require(wmpkgfile);
      var paths = util.extractPaths(wmpkgdir);
      wmmanifest._directories = paths.directories;
      wmmanifest._files = paths.files;
      fs.writeFileSync(wmpkgfile, JSON.stringify(wmmanifest, null, '  '), 'utf8');*/
    
      util.visitSubPackages(wmpkgdir, function(pkg) {
        var manifestfile = path.join(pkg.directory, 'package.json');
        if( fs.existsSync(manifestfile) ) {
          var manifest = require(manifestfile);
          var paths = util.extractPaths(pkg.directory);
          manifest._directories = paths.directories;
          manifest._files = paths.files;
          fs.writeFileSync(manifestfile, JSON.stringify(manifest, null, '  '), 'utf8');
        }
      });
    })();
  }
  
  return function webmodules(req, res, next) {
    if( arguments.length <= 2 ) next = finalhandler(req, res);
    
    //console.log('req', req.url);
    if( pkg && selfdir && req.url.startsWith('/' + pkg.name + '/') ) {
      req.url = req.url.substring(('/' + pkg.name + '/').length);
      selfdir(req, res, next);
    } else if( runtimedir && req.url.startsWith('/webmodules/') ) {
      req.url = req.url.substring('/webmodules/'.length);
      runtimedir(req, res, next);
    } else if( moduledir ) {
      moduledir(req, res, next);
    } else {
      next();
    }
  };
};