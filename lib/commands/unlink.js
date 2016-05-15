var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var inquirer = require('inquirer');
var semver = require('semver');

module.exports = function link(options, done) {
  var cwd = options.cwd || process.cwd();
  var rcfile = path.join(cwd, '.webmodulesrc');
  
  if( !fs.existsSync(rcfile) ) return done();
  
  try {
    var rc = JSON.parse(fs.readFileSync(rcfile));
    var name = options.name;
    
    if( !rc.links || !rc.links[name] ) return done();
    
    delete rc.links[name];
    
    fs.writeFileSync(rcfile, JSON.stringify(rc, null, '  '), 'utf8');
    done(null, {
      name: name
    });
  } catch(err) {
    done(err);
  }
};