var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var inquirer = require('inquirer');
var semver = require('semver');

module.exports = function init(options, done) {
  var cwd = options.cwd || process.cwd();
  var pkgfile = path.join(cwd, 'package.json');
  var manifest = fs.existsSync(pkgfile) ? require(pkgfile) : {name: path.parse(cwd).base};
  
  function save(done) {
    try {
      fs.writeFileSync(pkgfile, JSON.stringify(manifest, null, '  '), 'utf8');
      done(null, manifest);
    } catch(err) {
      done(err);
    }
  }
  
  function finish(done) {
    if( options.interactive ) {
      console.log('- package.json');
      console.log(JSON.stringify(manifest, null, '  '));
      console.log();
      inquirer.prompt([
        {
          type: 'confirm',
          name: 'ok',
          message: 'Is Okay:',
          default: true
        }
      ]).then(function(answers) {
        if( answers.ok ) {
          save(done);
        } else {
          done();
        }
      });
    } else {
      save(done);
    }
  }
  
  if( options.interactive ) {
    inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Name:',
        default: manifest.name,
        validate: function(value) {
          if( value ) return true;
        }
      }, {
        type: 'input',
        name: 'version',
        message: 'Version:',
        default: manifest.version || '0.0.0',
        validate: function(value) {
          if( value && semver.valid(value) ) return true;
        }
      }, {
        type: 'input',
        name: 'description',
        message: 'Description:',
        default: manifest.description
      }, {
        type: 'input',
        name: 'web',
        message: 'Web main:',
        default: manifest.web,
        validate: function(value) {
          if( value ) return true;
        }
      }, {
        type: 'input',
        name: 'main',
        message: 'Nodejs main:',
        default: function(answers) {
          return manifest.main || answers.web;
        },
        validate: function(value) {
          if( value ) return true;
        }
      }
    ]).then(function (answers) {
      manifest.name = answers.name || manifest.name;
      manifest.version = answers.version || manifest.version;
      manifest.description = answers.description || manifest.description;
      manifest.web = answers.web || manifest.web;
      manifest.main = answers.main || manifest.main;
      
      finish(done);
    });
  } else {
    manifest.name = options.name || manifest.name;
    manifest.version = options.version || manifest.version;
    manifest.description = options.description || manifest.description;
    manifest.repository = options.repository || manifest.repository;
    manifest.license = options.license || manifest.license;
    manifest.author = options.author || manifest.author;
    manifest.main = options.main || manifest.main;
    manifest.web = options.web || manifest.web;
    
    finish(done);
  }
};