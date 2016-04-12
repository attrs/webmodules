var fs = require('fs');
var path = require('path');
var async = require('async');

var default_repository;
var repositories = {};
var repository = {
  get: function(name) {
    return repositories[name];
  },
  add: function(name, repository) {
    repositories[name] = repository;
    return this;
  },
  default: function(repository) {
    if( !arguments.length ) return default_repository;
    default_repository = repository;
    return this;
  }
};

repository.add('bower', require('../installer/bower.js'));
repository.default(require('../installer/npm.js'));

function extractSubDependencies(pkg) {
  var webDependencies = pkg && pkg.webDependencies;
  var pkgs = [];
  Object.keys(webDependencies || {}).forEach(function(k) {
    var version = webDependencies[k];
    var repo, pos = version.indexOf(':');
    if( ~pos ) {
      repo = version.substring(0, pos);
      version = version.substring(pos + 1);
    }
    if( repo ) pkgs.push(repo + ':' + k + '@' + version);
    else pkgs.push(k + '@' + version);
  });
  return pkgs;
}

module.exports = {
  get repository() {
    return repository;
  },
  install: function(pkgs, options, done) {
    // load .webmodulesrc file
    var cwd = options.cwd || process.cwd();
    var target = path.resolve(cwd, options['module-directory'] || 'web_modules');
    
    if( !fs.existsSync(target) ) fs.mkdirSync(target);
    
    if( !pkgs || !pkgs.length ) {
      var pkgfile = path.join(process.cwd(), 'package.json');
      if( !fs.existsSync(pkgfile) ) return done(new Error('package.json file not found'));
      pkgs = extractSubDependencies(require(pkgfile));
    }
    
    if( !pkgs.length ) return done(null, []);
    
    var installed = [];
    async.eachSeries(pkgs, function(pkg, done) {
      var repo = repository.default();
      if( ~pkg.indexOf(':') ) {
        var reponame = pkg.substring(0, pkg.indexOf(':'));
        repo = repository.get(reponame);
        if( !repo ) return done(new Error('not found repository:' + reponame));
      }
      
      repo.install(pkg, {
        target: target
      }, function(err, pkg) {
        if( err ) return done(err);
        installed.push(pkg);
        
        // install sub web modules
        var pkgs = extractSubDependencies(pkg.manifest);
        
        done();
      });
    }, function(err) {
      if( err ) return done(err);
      done(null, installed);
    });
    return this;
  },
  uninstall: function(pkgs, options, done) {
    
  },
  init: function(options, done) {
  }
};