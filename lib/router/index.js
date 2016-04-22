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
  
  // write _files & _directory fields.
  if( options.modifyPackageFiles !== false ) {
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
    if( req.url.startsWith('/webmodules/') ) {
      req.url = req.url.substring('/webmodules/'.length);
      runtimedir(req, res, next);
    } else {
      moduledir(req, res, next);
    }
  };
};