var path = require('path');
var fs = require('fs-extra');
var npm = require('npm');
var os = require('os');
var async = require('async');
var semver = require('semver');

module.exports = {
  install: function(pkg, options, done) {
    if( !pkg ) return done(new Error('missing pkg'));
    if( typeof pkg !== 'string' ) return done(new Error('pkgs must be a string'));
    if( !options ) return done(new Error('missing options'));
    if( !options.target ) return done(new Error('missing options.target'));
    
    var tmp = path.join(options.target, '.temp');
    fs.removeSync(tmp);
    if( !fs.existsSync(tmp) ) fs.mkdirSync(tmp);
    
    var target = options.target;
    npm.load({
      'loglevel': options.loglevel || 'silent',
      'unsafe-perm': options['unsafe-perm'] || 'true',
      'no-optional': 'true',
      'legacy-bundling': 'true'
    }, function(err) {
      if(err) return done(err);
      
      npm.commands.install(tmp, [pkg], function (err, data) {
        if(err) return done(err);
        
        var downloaded = path.resolve(process.cwd(), data[data.length - 1][1]);
        var manifest = require(path.join(downloaded, 'package.json'));
        var name = manifest.name;
        var version = manifest.version;
        var directory = path.join(target, name);
        
        // locate to target directory
        if( fs.existsSync(directory) ) fs.removeSync(directory);
        fs.renameSync(downloaded, directory);
        fs.removeSync(tmp);
        
        done(null, {
          directory: path.normalize(directory),
          manifest: manifest,
          name: name,
          version: version
        });
      });
    });
    
    return this;
  },
  uninstall: function(pkg, options, done) {
    return this;
  }
}

//npm show ${package}
//https://registry.npmjs.org/${package}/-/${archive}
//https://registry.npmjs.org/node-libs-browser/-/node-libs-browser-1.0.0.tgz