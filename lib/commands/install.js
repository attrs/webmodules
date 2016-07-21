var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var util = require('../util.js');
var schemes = require('../schemes.js');

module.exports = function install(pkgs, options, done) {
  // load .webmodulesrc file
  var cwd = options.cwd || process.cwd();
  var pkgfile = path.join(cwd, 'package.json');
  var rcfile = path.join(cwd, '.webmodulesrc');
  var target = path.resolve(cwd, 'web_modules');
  var manifest = fs.existsSync(pkgfile) ? require(pkgfile) : null;
  
  if( cwd === process.cwd() && fs.existsSync(rcfile) ) {
    var rc = JSON.parse(fs.readFileSync(rcfile));
    if( rc.directory ) target = path.resolve(cwd, rc.directory);
  }
  
  if( options.directory ) target = path.resolve(cwd, options.directory);
  if( !fs.existsSync(target) ) fs.mkdirsSync(target);
  
  // validate webDependendies -> browserDependencies
  if( manifest && (manifest.browserDependencies || manifest.webDependencies) ) {
    var deps = manifest.browserDependencies || {};
    var wdeps = manifest.webDependencies;
    for(var k in wdeps) deps[k] = wdeps[k];
    delete manifest.webDependencies;
  }
  
  if( !pkgs || !pkgs.length ) {
    if( !manifest ) return done(new Error('package.json file not found'));
    var deps = manifest.browserDependencies;
    pkgs = util.extractDependencies(deps);
  }
  
  if( !pkgs.length ) return done(null, []);
  
  //console.log('pkgs', pkgs);
  
  var installed = [];
  async.eachSeries(pkgs, function(pkg, done) {
    pkg = util.parseExpression(pkg);
    
    console.log('- Installing %s from %s', pkg.expression, pkg.scheme, (pkg.alias ? (' as ' + pkg.alias) : ''));
    
    var resolver = schemes.get(pkg.scheme);
    if( !resolver ) return done(new Error('not found repository scheme:' + pkg.scheme));
    
    resolver.install(pkg, {
      target: target
    }, function(err, result) {
      if( err ) return done(err);
      
      pkg.manifest = result.manifest;
      pkg.directory = result.directory;
      pkg.name = result.name;
      pkg.expression = pkg.scheme === 'npm' ? result.expression : (pkg.scheme + ':' + result.expression);
      pkg.version = result.version;
      
      installed.push(pkg);
      
      /*
      function installPeers(err) {
        if( err ) return done(err);
        
        var deps = pkg.manifest && (pkg.manifest.browserPeerDependencies || pkg.manifest.webPeerDependencies);
        var pkgs = util.extractDependencies(deps);
        if( !pkgs.length ) return done();
        
        install(pkgs, {
          cwd: cwd
        }, done);
      }
      */
      
      // write dirs & files paths to package.json
      var paths = util.extractPaths(pkg.directory);
      pkg.manifest._directories = paths.directories;
      pkg.manifest._files = paths.files;
      fs.writeFileSync(path.join(pkg.directory, 'package.json'), JSON.stringify(pkg.manifest, null, '  '), 'utf8');
      util.visitSubPackages(pkg.directory, function(pkg) {
        var manifestfile = path.join(pkg.directory, 'package.json');
        if( fs.existsSync(manifestfile) ) {
          var manifest = require(manifestfile);
          var paths = util.extractPaths(pkg.directory);
          manifest._directories = paths.directories;
          manifest._files = paths.files;
          fs.writeFileSync(manifestfile, JSON.stringify(manifest, null, '  '), 'utf8');
        }
      });
      
      // search sub web modules in current packages
      var deps = pkg.manifest && pkg.manifest.browserDependencies;
      var pkgs = util.extractDependencies(deps);
      if( !pkgs.length ) return done();
      
      // install sub web modules
      install(pkgs, {
        cwd: pkg.directory
      }, done);
    });
  }, function(err) {
    if( err ) return done(err);
    
    if( manifest && options.save ) {
      var wd = manifest.browserDependencies;
      if( !wd ) wd = manifest.browserDependencies = {};
      installed.forEach(function(info) {
        wd[info.name] = info.expression;
      });
      
      fs.writeFileSync(pkgfile, JSON.stringify(manifest, null, '  '), 'utf8');
    }
    
    done(null, installed);
  });
  return this;
};