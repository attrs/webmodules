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

commander.version(pkg.version);

commander
  .command('up [port] [docbase]')
  .alias('start')
  .description('Start Server')
  .option('-b, --docbase [value]', 'docbase')
  .option('-d, --defpage [value]', 'default page path for single page application')
  .option('-p, --port [value]', 'port')
  .option('-s, --self', 'self reference mode')
  .action(function(port, docbase, options) {
    var host;
    
    if( port && ~port.indexOf(':') ) {
      host = port.substring(0, port.indexOf(':'));
      port = port.substring(port.indexOf(':') + 1);
    }
    
    if( !docbase && isNaN(+port) ) docbase = port, port = null;
    
    lib.commands.up({
      host: host,
      port: +options.port || +port || 9000,
      docbase: options.docbase || docbase,
      defpage: options.defpage,
      selfref: options.self ? true : false
    }, function(err, httpd) {
      if( err ) return error(err);
      
      console.log(chalk.cyan('docbase is'), httpd.docbase);
      console.log(chalk.cyan('httpd listening at'), httpd.address.address + ':' + httpd.address.port);
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
