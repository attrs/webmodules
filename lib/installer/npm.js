var path = require('path');
var fs = require('fs-extra');
var npm = require('npm');

module.exports = {
  install: function(pkg, options, done) {
    if( !pkg ) return done(new Error('missing pkg'));
    if( !options ) return done(new Error('missing options'));
    if( !options.target ) return done(new Error('missing options.target'));
    
    var scheme = pkg.scheme;
    var alias = pkg.alias;
    var expression = pkg.expression;
    var target = options.target;
    var tmp = path.join(options.target, '.temp');
    
    if( scheme !== 'npm' ) expression = scheme + ':' + expression;
    
    fs.removeSync(tmp);
    if( !fs.existsSync(tmp) ) fs.mkdirSync(tmp);
    
    npm.load({
      'loglevel': options.loglevel || 'silent',
      'unsafe-perm': options['unsafe-perm'] || 'true',
      'no-optional': 'true',
      'legacy-bundling': 'true'
    }, function(err) {
      if(err) return done(err);
      
      npm.commands.install(tmp, [expression], function (err, data) {
        if(err) return done(err);
        
        var downloaded = data[data.length - 1][1];
        var manifest = require(path.join(downloaded, 'package.json'));
        var name = alias || manifest.name;
        var version = manifest.version;
        var directory = path.join(target, name);
        
        if( !~expression.indexOf('/') && !~expression.indexOf(':') ) expression = '^' + version;
        
        // locate to target directory
        if( fs.existsSync(directory) ) fs.removeSync(directory);
        fs.mkdirsSync(directory);
        fs.renameSync(downloaded, directory);
        fs.removeSync(tmp);
        
        done(null, {
          directory: path.normalize(directory),
          manifest: manifest,
          name: name,
          version: version,
          expression: expression
        });
      });
    });
  }
}

//npm show ${package}
//https://registry.npmjs.org/${package}/-/${archive}
//https://registry.npmjs.org/node-libs-browser/-/node-libs-browser-1.0.0.tgz