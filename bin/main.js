#!/usr/bin/env node

var chalk = require('chalk');
var path = require('path');
var fs = require('fs');
var commander = require('commander');
var inquirer = require('inquirer');
var async = require('async');
var moment = require('moment');
var simplegit = require('simple-git');
var Table = require('cli-table2');

var pkg = require('../package.json');
var lib = require('../');

process.title = pkg.name;

function error(err) {
  var message;
  if( process.env.NODE_ENV == 'development' ) {
    message = err.stack || err;
  } else {
    message = err.message || err;
  }
  
  console.error(chalk.red(message));
}

commander.version(pkg.version);

commander
  .command('install <pkg...>')
  .alias('i')
  .description('Install Modules')
  .action(function(pkg, options) {
    lib.install({
      pkg: pkg
    }, function(err, pkgs) {
      if( err ) return error(err);
      console.log('installed', pkgs.length);
      pkgs.forEach(function(pkg) {
        console.log('- ' + pkg.name + '@' + pkg.version);
      });
    });
  })
  .on('--help', function() {
    console.log('  Examples:');
    console.log();
    console.log('  $ wm install bower:pacakgename');
    console.log('  $ wm install npm:pacakgename');
    console.log();
  });

commander
  .command('uninstall <pkg...>')
  .alias('u')
  .description('Uninstall Modules')
  .action(function(pkg, options) {
    lib.uninstall({
      pkg: pkg
    }, function(err, pkgs) {
      if( err ) return error(err);
      console.log('uninstalled', pkgs.length);
      pkgs.forEach(function(pkg) {
        console.log('- ' + pkg.name + '@' + pkg.version);
      });
    });
  })
  .on('--help', function() {
    console.log('  Examples:');
    console.log();
    console.log('  $ wm uninstall bower:pacakgename');
    console.log('  $ wm uninstall npm:pacakgename');
    console.log();
  });

commander
  .action(function (action) {
    console.log('Unknown Command \'%s\'', action || '');
    commander.outputHelp();
  })
  .parse(process.argv);

if( !process.argv.slice(2).length ) commander.outputHelp();
