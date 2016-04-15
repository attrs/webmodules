var path = require('path');
var fs = require('fs-extra');
var bower = require('bower');

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
    
    fs.removeSync(tmp);
    if( !fs.existsSync(tmp) ) fs.mkdirSync(tmp);
    
    expression = expression.split('@').join('#');
    
    //console.log('expression', expression);
    
    bower.commands
    .install([expression], { save:false }, { interactive: true, directory: tmp })
    .on('error', function(err) {
      done(err);
    })
    .on('end', function (installed) {
      var meta = installed[Object.keys(installed)[0]];
      var downloaded = meta.canonicalDir;
      var bowerfile = path.join(downloaded, 'bower.json');
      var pkgfile = path.join(downloaded, 'package.json');
      
      if( !fs.existsSync(bowerfile) ) bowerfile = path.join(downloaded, '.bower.json');
      if( !fs.existsSync(bowerfile) ) return done(new Error('not found bower.json file/module:' + downloaded));
      
      var manifest = fs.existsSync(pkgfile) ? require(pkgfile) : {};
      var bower_manifest = fs.existsSync(bowerfile) ? require(bowerfile) : null;
      
      // edit package.json
      manifest.name = bower_manifest.name || manifest.name;
      manifest.version = meta.pkgMeta.version || bower_manifest.version || manifest.version;
      manifest.description = bower_manifest.description;
      manifest.repository = bower_manifest.repository;
      manifest.web = bower_manifest.main || manifest.web;
      manifest.moduleType = bower_manifest.moduleType || manifest.moduleType;
      
      var name = alias || manifest.name;
      var version = manifest.version;
      var directory = path.join(target, name);
      var moduleType = manifest.moduleType || ['globals'];
      if( typeof moduleType === 'string' ) moduleType = [moduleType];
      
      // build browserDependencies
      var dependencies;
      if( bower_manifest.dependencies ) {
        dependencies = {};
        Object.keys(bower_manifest.dependencies).forEach(function(key) {
          dependencies[key] = 'bower:' + bower_manifest.dependencies[key];
        });
      }
      
      manifest.browserDependencies = dependencies || manifest.browserDependencies;
      
      if( ~moduleType.indexOf('es6') ) manifest.esversion = 'es6';
      if( !~expression.indexOf('/') && !~expression.indexOf(':') && version ) expression = '^' + version;
      
      // save package.json
      fs.writeFileSync(pkgfile, JSON.stringify(manifest, null, '  '), 'utf8');
      
      // locate to target directory
      if( fs.existsSync(directory) ) fs.removeSync(directory);
      fs.renameSync(downloaded, directory);
      fs.removeSync(tmp);
      
      done(null, {
        directory: path.normalize(directory),
        manifest: manifest,
        name: name,
        version: version || '0.0.0',
        expression: expression
      });
    });
  }
};