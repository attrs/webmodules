var path = require('path');
var fs = require('fs');
var npm = require('npm');
var os = require('os');
var async = require('async');
var semver = require('semver');
var wrench = require('wrench');
var EventEmitter = require('events').EventEmitter;

var emitter = new EventEmitter();
var detected = {};

var plugins = {
  get home() {
    return home;
  },
  set home(dir) {
    if( !dir || typeof dir !== 'string' ) throw new TypeError('dir must be a path string');
    home = dir;
    plugins.refresh();
  },
  refresh: function(done) {
    var files = fs.readdirSync(home);
    var current = {};

    files.forEach(function(file) {
      try {
        var dir = path.join(home, file);
        var pkg = require(path.join(dir, 'package.json'));
        
        if( !pkg.name ) return;
        if( !pkg.version ) return;

        var versions = current[pkg.name] = current[pkg.name] || [];
        var plugin = {
          name: pkg.name,
          version: pkg.version,
          dir: dir,
          pkg: pkg
        };

        versions.push(plugin);
        versions.sort(function compare(a, b) {
          return semver.compare(b.version, a.version);
        });

        if( !plugins.get(pkg.name) ) {
          emitter.emit('detect', {
            type: 'detect',
            plugin: plugin
          });
        }

        if( !plugins.get(pkg.name, pkg.version) ) {
          emitter.emit('detect.version', {
            type: 'detect.version',
            plugin: plugin
          });
        }
      } catch(err) {}
    });

    detected = current;
    if( typeof done === 'function' ) return done();

    return this;
  },
  install: function(options, done) {
    if( !options ) return done(new Error('missing options'));
    if( !options.pkg ) return done(new Error('missing options.pkg'));
    if( typeof options.pkg === 'string' ) options.pkg = [options.pkg]; 
    if( !Array.isArray(options.pkg) ) return done(new Error('invalid type of options.pkg'));

    var installed = [];
    npm.load({
      'loglevel': 'error',
      'unsafe-perm': 'true'
    }, function(err) {
      if(err) return done(err);
    
      wrench.rmdirSyncRecursive(tmpdir, true);
      wrench.mkdirSyncRecursive(tmpdir);
      wrench.mkdirSyncRecursive(home);

      async.eachSeries(options.pkg, function(pkg, done) {
        if( !pkg || typeof pkg !== 'string' ) return done(new Error('package name must be a string but ' + pkg));

        npm.commands.install(tmpdir, [pkg], function (err, data) {
          if(err) return done(err);

          var downloaded = path.resolve(process.cwd(), data[data.length - 1][1]);
          var pkg = require(path.resolve(downloaded, 'package.json'));
          var name = pkg.name;
          var version = pkg.version;

          // rename to
          var dir = path.resolve(home, (name + '@' + version));
          if( fs.existsSync(dir) ) wrench.rmdirSyncRecursive(dir);
          fs.renameSync(downloaded, dir);

          installed.push({
            name: name,
            version: version,
            pkg: pkg,
            dir: dir
          });
          done();
        });
      }, function(err) {
        if( err ) return done(err);
        wrench.rmdirSyncRecursive(tmpdir, true);

        setTimeout(function() {
          plugins.refresh();

          if( installed.length ) emitter.emit('install', {
            type: 'install',
            installed: installed
          });

          done(null, installed);
        }, 150);
      });
    });
    
    return this;
  },
  uninstall: function(options, done) {
    if( !options ) return done(new Error('missing options'));
    if( !options.pkg ) return done(new Error('missing options.pkg'));
    if( typeof options.pkg === 'string' ) options.pkg = [options.pkg]; 
    if( !Array.isArray(options.pkg) ) return done(new Error('invalid type of options.pkg'));

    var uninstalled = [];
    async.eachSeries(options.pkg, function(pkg, done) {
      if( !pkg || typeof pkg !== 'string' ) return done(new Error('package name must be a string but ' + pkg));

      var name, version, i;
      if( ~(i = pkg.indexOf('@')) ) {
        name = pkg.substring(0, i);
        version = pkg.substring(i+1);
      } else {
        name = pkg;
      }
        
      plugins.find(name, version).forEach(function(plugin) {
        wrench.rmdirSyncRecursive(plugin.dir);
        uninstalled.push(plugin);
      });

      done();
    }, function(err) {
      if( err ) return done(err);
      plugins.refresh();

      if( uninstalled.length ) emitter.emit('uninstall', {
        type: 'uninstall', 
        uninstalled: uninstalled
      });
      done(null, uninstalled);
    });
    
    return this;
  },
  add: function(pkg, basedir) {
    if( !pkg ) throw new Error('missing arguments');
    if( !pkg.name || typeof pkg.name !== 'string' ) throw new Error('invalid pkg.name');
    if( !pkg.version || !semver.valid(pkg.version) ) throw new Error('invalid pkg.version');

    var versions = detected[pkg.name] = detected[pkg.name] || [];
    var plugin = {
      name: pkg.name,
      version: pkg.version,
      pkg: pkg,
      dir: basedir || path.join(__dirname, '..', '..')
    };
    
    if( !plugins.get(pkg.name) ) {
      emitter.emit('detect', {
        type: 'detect',
        plugin: plugin
      });
    }

    if( !plugins.get(pkg.name, pkg.version) ) {
      emitter.emit('detect.version', {
        type: 'detect.version',
        plugin: plugin
      });
    }

    versions.push(plugin);
    versions.sort(function compare(a, b) {
      return semver.compare(b.version, a.version);
    });

    return this;
  },
  get: function(name, version) {
    if( !version || ~version.indexOf('/') || version.indexOf('file:') ) version = '*';
    if( version.toLowerCase() === 'latest' || version === '*' ) return detected[name] && detected[name][0];
    
    var arr = plugins.find(name, version);
    return arr && arr[0];
  },
  find: function(name, range) {
    if( !range ) return detected[name] || [];
    if( range.toLowerCase() === 'latest' || range === '*' ) return detected[name] ? [detected[name][0]] : [];

    var matched = [];
    if( semver.valid(range) || semver.validRange(range) ) {
      (detected[name] || []).forEach(function(plugin) {
        if( semver.satisfies(plugin.version, range) ) {
          matched.push(plugin);
        }
      });
    }
    return matched;
  },
  latest: function(name) {
    return detected[name] && detected[name][0];
  },
  names: function() {
    var arr = [];
    for(var k in detected) arr.push(k);
    return arr;
  },
  versions: function(name) {
    var versions = detected[name];
    if( versions ) {
      var arr = [];
      versions.forEach(function(version) {
        arr.push(version);
      });
      return arr;
    }
    return null;
  },
  on: function(type, fn) {
    emitter.on(type, fn);
    return this;
  },
  once: function(type, fn) {
    emitter.once(type, fn);
    return this;
  },
  off: function(type, fn) {
    emitter.removeListener(type, fn);
    return this;
  }
};

plugins.refresh();
module.exports = plugins;