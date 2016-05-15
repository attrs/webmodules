#!/usr/bin/env node

var chalk = require('chalk');
var commander = require('commander');
var async = require('async');
var open = require('open');

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
  .command('up [port] [docbase]')
  .alias('start')
  .description('Start Server')
  .option('-s, --self', 'self reference mode')
  .option('-o, --open [value]', 'open in browser')
  .action(function(port, docbase, options) {
    var host;
    
    if( port && ~port.indexOf(':') ) {
      host = port.substring(0, port.indexOf(':'));
      port = port.substring(port.indexOf(':') + 1);
    }
    
    if( !docbase && isNaN(+port) ) docbase = port, port = null;
    
    lib.commands.up({
      host: host,
      port: +port || 0,
      docbase: docbase,
      selfref: options.self ? true : false
    }, function(err, httpd) {
      if( err ) return error(err);
      
      console.log(chalk.cyan('docbase is'), httpd.docbase);
      console.log(chalk.cyan('httpd listening at'), httpd.address.address + ':' + httpd.address.port);
      if( options.open ) {
        open(
          'http://' + (httpd.address.address === '0.0.0.0' ? 'localhost' : httpd.address.address) + ':' + httpd.address.port, 
          typeof options.open === 'string' ? options.open : null
        );
      }
    });
  })
  .on('--help', function() {
    console.log('  Examples:');
    console.log();
    console.log('  $ wpm up');
    console.log('  $ wpm up 8080');
    console.log('  $ wpm up 8080 ./public');
    console.log('  $ wpm up 8080 ./public -s');
    console.log('  $ wpm up 8080 ./public -s -o');
    console.log();
  });

commander
  .command('link <dir> [name]')
  .description('Link Module')
  .action(function(dir, name) {
    lib.commands.link({
      dir: dir,
      name: name
    }, function(err, result) {
      if( err ) return error(err);
      
      console.log('%s \'%s\' to \'%s\'', chalk.cyan('link'), result.name, result.dir);
    });
  })
  .on('--help', function() {
    console.log('  Examples:');
    console.log();
    console.log('  $ wpm link /path/to/link pkgname');
    console.log();
  });

commander
  .command('unlink <name>')
  .description('Unlink Module')
  .action(function(name) {
    lib.commands.unlink({
      name: name
    }, function(err, result) {
      if( err ) return error(err);
      if( !result ) return console.log('%s \'%s\'', chalk.cyan('not exists link: '), name);
      
      console.log('%s \'%s\'', chalk.cyan('unlink'), result.name);
    });
  })
  .on('--help', function() {
    console.log('  Examples:');
    console.log();
    console.log('  $ wpm unlink pkgname');
    console.log();
  });
  
commander
  .action(function (action) {
    console.log('Unknown Command \'%s\'', action || '');
    commander.outputHelp();
  })
  .parse(process.argv);

if( !process.argv.slice(2).length ) commander.outputHelp();
