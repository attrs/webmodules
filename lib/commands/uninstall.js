var fs = require('fs-extra');
var path = require('path');
var async = require('async');

module.exports = function uninstall(pkgs, options, done) {
  if( !pkgs || !pkgs.length ) return done(null, []);
  var cwd = options.cwd || process.cwd();
  var pkgfile = path.join(cwd, 'package.json');
  var rcfile = path.join(cwd, '.webmodulesrc');
  var target = path.resolve(cwd, 'web_modules');
  
  if( cwd === process.cwd() && fs.existsSync(rcfile) ) {
    var rc = JSON.parse(fs.readFileSync(rcfile));
    if( rc.directory ) target = path.resolve(cwd, rc.directory);
  }
  
  if( options.directory ) target = path.resolve(cwd, options.directory);
  if( !fs.existsSync(target) ) return done(null, []);
  
  var uninstalled = [];
  async.eachSeries(pkgs, function(name, done) {
    var dir = path.join(target, name);
    if( fs.existsSync(dir) ) {
      console.log('- Uninstalling %s ', name, dir);
      var pkgfile = path.join(dir, 'package.json');
      var pkg = fs.existsSync(pkgfile) ? require(pkgfile) : {};
      fs.removeSync(dir);
      uninstalled.push({
        name: name,
        version: pkg.version,
        directory: dir
      });
    }
    done();
  }, function(err) {
    if( err ) return done(err);
    
    if( options.save && fs.existsSync(pkgfile) ) {
      var manifest = require(pkgfile);
      var wd = manifest.webDependencies = manifest.webDependencies || {};
      uninstalled.forEach(function(pkg) {
        delete wd[pkg.name];
      });
      
      fs.writeFileSync(pkgfile, JSON.stringify(manifest, null, '  '), 'utf8');
    }
    
    done(null, uninstalled);
  });
};