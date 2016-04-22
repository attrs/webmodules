var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var semver = require('semver');

var schemes = (function() {
  var default_scheme;
  var schememap = {};
  
  return {
    get: function(name) {
      return schememap[name];
    },
    add: function(name, resolver) {
      schememap[name] = resolver;
      return this;
    },
    default: function(name) {
      if( !arguments.length ) return default_scheme;
      default_scheme = name;
      return this;
    }
  };
})();

schemes.add('bower', require('../installer/bower.js'));
schemes.add('gitlab', require('../installer/npm.js'));
schemes.add('github', require('../installer/npm.js'));
schemes.add('gist', require('../installer/npm.js'));
schemes.add('bitbucket', require('../installer/npm.js'));
schemes.add('npm', require('../installer/npm.js'));
schemes.default('npm');

/**
 * dependency indicator spec
 * 
 */

function extractDependencies(dependencies) {
  var pkgs = [];
  Object.keys(dependencies || {}).forEach(function(k) {
    var expression = dependencies[k];
    var name = k, scheme, pos = expression.indexOf(':');
    if( ~pos ) {
      scheme = expression.substring(0, pos);
      expression = expression.substring(pos + 1);
    }
    
    scheme = scheme || schemes.default();
    
    // is version
    if( ~['*', 'latest'].indexOf(expression) ) {
      pkgs.push(scheme + ':' + k);
    } else if( semver.validRange(expression) ) {
      pkgs.push(scheme + ':' + k + '@' + expression);
    } else {
      pkgs.push(scheme + ':' + name + '[' + expression + ']');
    }
  });
  return pkgs;
}

function parse(expression) {
  var alias = (function() {
    var pos = expression.indexOf('[');
    if( ~pos ) return expression.substring(0, pos);
  })();
  
  if( alias ) {
    expression = (function() {
      expression = expression.substring(expression.indexOf('[') + 1)
      expression = expression.substring(0, expression.lastIndexOf(']'));
      return expression;
    })();
  }
  
  var scheme = (function() {
    if( alias && ~alias.indexOf(':') ) return alias.substring(0, alias.indexOf(':'));
    if( expression && ~expression.indexOf(':') ) return expression.substring(0, expression.indexOf(':'));
  })();
  
  if( alias && ~alias.indexOf(':') ) alias = alias.substring(alias.indexOf(':') + 1);
  if( expression && ~expression.indexOf(':') ) expression = expression.substring(expression.indexOf(':') + 1);
  
  return {
    scheme: scheme || schemes.default(),
    alias: alias,
    expression: expression
  }
}


var extractPaths = (function() {
  var defaultExcludes = ['.', '..', 'node_modules', 'web_modules', '.DS_Store', '.git', '.gitignore', '.svn', '.cvs'];
  
  return function(basedir, excludes) {
    var dirs = [], files = [], excludes = excludes || [];
    
    function visit(dir) {
      var list = fs.readdirSync(dir);
      list.forEach(function(filename) {
        if( ~defaultExcludes.indexOf(filename) ) return;
        if( ~excludes.indexOf(filename) ) return;
        var file = path.join(dir, filename);
        var stat = fs.statSync(file);
        if( stat.isDirectory() ) dirs.push(file.substring(basedir.length)), visit(file);
        else if( stat.isFile() ) files.push(file.substring(basedir.length));
      });
    }
    
    visit(basedir);
    
    return {
      basedir: basedir,
      directories: dirs,
      files: files
    }
  }
})();

function visitSubPackages(basedir, listener) {
  var founds = [];
  
  function visit(dir) {
    function visitpkgs(subpkgdir) {
      if( fs.existsSync(subpkgdir) ) {
        var list = fs.readdirSync(subpkgdir);
        list.forEach(function(filename) {
          var pkgdir = path.join(subpkgdir, filename);
          var stat = fs.statSync(pkgdir);
          if( filename[0] === '.' || !stat.isDirectory() ) return;
          
          if( filename[0] === '@' ) {  // private npm
            fs.readdirSync(pkgdir).forEach(function(_filename) {
              var _pkgdir = path.join(pkgdir, _filename);
              founds.push(_pkgdir);
              listener && listener({
                name: '@' + filename + '/' + _filename,
                directory: _pkgdir,
                parent: dir
              });
              visit(_pkgdir);
            });
          } else {
            founds.push(pkgdir);
            listener && listener({
              name: filename,
              directory: pkgdir,
              parent: dir
            });
            visit(pkgdir);
          }
        });
      }
    }
    
    visitpkgs(path.join(dir, 'node_modules'));
    visitpkgs(path.join(dir, 'web_modules'));
  }
  
  visit(basedir);
  return founds;
}

module.exports = function install(pkgs, options, done) {
  // load .webmodulesrc file
  var cwd = options.cwd || process.cwd();
  var pkgfile = path.join(cwd, 'package.json');
  var rcfile = path.join(cwd, '.webmodulesrc');
  var target = path.resolve(cwd, 'web_modules');
  
  if( cwd === process.cwd() && fs.existsSync(rcfile) ) {
    var rc = JSON.parse(fs.readFileSync(rcfile));
    if( rc.directory ) target = path.resolve(cwd, rc.directory);
  }
  
  if( options.directory ) target = path.resolve(cwd, options.directory);
  if( !fs.existsSync(target) ) fs.mkdirsSync(target);
  
  if( !pkgs || !pkgs.length ) {
    if( !fs.existsSync(pkgfile) ) return done(new Error('package.json file not found'));
    var deps = require(pkgfile).browserDependencies || require(pkgfile).webDependencies;
    pkgs = extractDependencies(deps);
    options.save = false;
  }
  
  if( !pkgs.length ) return done(null, []);
  
  //console.log('pkgs', pkgs);
  
  var installed = [];
  async.eachSeries(pkgs, function(pkg, done) {
    pkg = parse(pkg);
    
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
        var pkgs = extractDependencies(deps);
        if( !pkgs.length ) return done();
        
        install(pkgs, {
          cwd: cwd
        }, done);
      }
      */
      
      // write dirs & files paths to package.json
      var paths = extractPaths(pkg.directory);
      pkg.manifest._directories = paths.directories;
      pkg.manifest._files = paths.files;
      fs.writeFileSync(path.join(pkg.directory, 'package.json'), JSON.stringify(pkg.manifest, null, '  '), 'utf8');
      visitSubPackages(pkg.directory, function(pkg) {
        var manifestfile = path.join(pkg.directory, 'package.json');
        if( fs.existsSync(manifestfile) ) {
          var manifest = require(manifestfile);
          var paths = extractPaths(pkg.directory);
          manifest._directories = paths.directories;
          manifest._files = paths.files;
          fs.writeFileSync(manifestfile, JSON.stringify(manifest, null, '  '), 'utf8');
        }
      });
      
      // search sub web modules in current packages
      var deps = pkg.manifest && (pkg.manifest.browserDependencies || pkg.manifest.webDependencies);
      var pkgs = extractDependencies(deps);
      if( !pkgs.length ) return done();
      
      // install sub web modules
      install(pkgs, {
        cwd: pkg.directory
      }, done);
    });
  }, function(err) {
    if( err ) return done(err);
    
    if( options.save && fs.existsSync(pkgfile) ) {
      var manifest = require(pkgfile);
      var wd = manifest.webDependencies || manifest.browserDependencies;
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