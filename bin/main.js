#!/usr/bin/env node

var chalk = require('chalk');
var commander = require('commander');
var async = require('async');

var pkg = require('../package.json');
var lib = require('../');

function error(err) {
  var message;
  if( process.env.NODE_ENV == 'development' ) message = err.stack || err;
  else message = err.message || err;
  console.error(chalk.red(message));
}

process.title = pkg.name;

commander
  .version(pkg.version)
  .command('install [pkgs...]')
  .alias('i')
  .option('-s, --save', 'save')
  .description('Install Modules')
  .action(function(pkgs, options) {
    lib.commands.install(pkgs, {
      save: options.save
    }, function(err, pkgs) {
      if( err ) return error(err);
      console.log('%s package(s) installed', pkgs.length);
      pkgs.forEach(function(pkg) {
        console.log('- ' + pkg.name + '@' + pkg.version);
      });
    });
  })
  .on('--help', function() {
    console.log('  Examples:');
    console.log();
    console.log('  $ wpm install npm_pacakge_name');
    console.log('  $ wpm install npm_pacakge_name --save');
    console.log('  $ wpm install bower:bower_pacakge_name');
    console.log();
  });

commander
  .command('uninstall [pkgs...]')
  .alias('u')
  .option('-s, --save', 'save')
  .description('Uninstall Modules')
  .action(function(pkgs, options) {
    lib.commands.uninstall(pkgs, {
      save: options.save
    }, function(err, pkgs) {
      if( err ) return error(err);
      console.log('%s package(s) uninstalled', pkgs.length);
      pkgs.forEach(function(pkg) {
        console.log('- ' + pkg.name + '@' + pkg.version);
      });
    });
  })
  .on('--help', function() {
    console.log('  Examples:');
    console.log();
    console.log('  $ wpm uninstall npm_pacakge_name');
    console.log('  $ wpm uninstall npm_pacakge_name --save');
    console.log('  $ wpm uninstall bower_pacakge_name');
    console.log();
  });

commander
  .command('init')
  .description('Init Module')
  .action(function(options) {
    lib.commands.init({
      interactive: true
    }, function(err) {
      if( err ) return error(err);
    });
  })
  .on('--help', function() {
    console.log('  Examples:');
    console.log();
    console.log('  $ wpm init');
    console.log();
  });

commander
  .action(function (action) {
    console.log('Unknown Command \'%s\'', action || '');
    commander.outputHelp();
  })
  .parse(process.argv);

if( !process.argv.slice(2).length ) commander.outputHelp();
