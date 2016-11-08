var fs = require('fs-extra');
var path = require('path');
var schemes = require('./schemes.js');
var semver = require('semver');

function endsWith(str, word) {
  if( !str || !word ) return false;
  if( str === word ) return true;
  var i = str.lastIndexOf(word);
  return i > 0 && i === str.length - word.length;
}

function startsWith(str, word) {
  if( !str || !word ) return false;
  if( str === word ) return true;
  return str.indexOf(word) === 0 ? true : false;
}

module.exports = {
  extractDependencies: function(dependencies) {
    var pkgs = [];
    Object.keys(dependencies || {}).forEach(function(k) {
      var expression = dependencies[k];
      var name = k, scheme, pos = expression.indexOf(':');
      if( ~pos ) {
        scheme = expression.substring(0, pos);
        expression = expression.substring(pos + 1);
      }
    
      scheme = scheme || schemes.default();
    
      // is version
      if( ~['*', 'latest'].indexOf(expression) ) {
        pkgs.push(scheme + ':' + k);
      } else if( semver.validRange(expression) ) {
        pkgs.push(scheme + ':' + k + '@' + expression);
      } else {
        pkgs.push(scheme + ':' + name + '[' + expression + ']');
      }
    });
    return pkgs;
  },
  parseExpression: function(expression) {
    var alias = (function() {
      var pos = expression.indexOf('[');
      if( ~pos ) return expression.substring(0, pos);
    })();
  
    if( alias ) {
      expression = (function() {
        expression = expression.substring(expression.indexOf('[') + 1)
        expression = expression.substring(0, expression.lastIndexOf(']'));
        return expression;
      })();
    }
  
    var scheme = (function() {
      if( alias && ~alias.indexOf(':') ) return alias.substring(0, alias.indexOf(':'));
      if( expression && ~expression.indexOf(':') ) return expression.substring(0, expression.indexOf(':'));
    })();
  
    if( alias && ~alias.indexOf(':') ) alias = alias.substring(alias.indexOf(':') + 1);
    if( expression && ~expression.indexOf(':') ) expression = expression.substring(expression.indexOf(':') + 1);
  
    return {
      scheme: scheme || schemes.default(),
      alias: alias,
      expression: expression
    }
  },
  extractPaths: (function() {
    var ignores = ['.', '..', 'npm-debug.log', '.DS_Store', '.git', '.gitignore', '.lock-wscript', '.hg', '.svn', 'CVS'];
    
    return function(basedir, excludes) {
      var dirs = [], files = [], excludes = excludes || [];
      
      function visit(dir, nomore) {
        var list = fs.readdirSync(dir);
        list.forEach(function(filename) {
          if( ~ignores.indexOf(filename) ) return;
          if( ~excludes.indexOf(filename) ) return;
          if( startsWith(filename, '._') || endsWith(filename, '.swp') || endsWith(filename, '.log') || startsWith(filename, '.wafpickle') ) return;
          
          var file = path.join(dir, filename);
          var stat = fs.statSync(file);
          if( stat.isDirectory() ) {
            dirs.push(file.substring(basedir.length));
            
            if( filename[0] == '@' ) visit(file, true);
            else if( !nomore ) visit(file, ~['node_modules', 'web_modules'].indexOf(filename));
          } else if( stat.isFile() ) {
            files.push(file.substring(basedir.length));
          }
        });
      }
      
      visit(basedir);
      
      return {
        basedir: basedir,
        directories: dirs,
        files: files
      }
    }
  })(),
  visitSubPackages: function(basedir, listener) {
    var founds = [];
    
    function visit(dir) {
      function visitpkgs(subpkgdir) {
        if( fs.existsSync(subpkgdir) ) {
          var list = fs.readdirSync(subpkgdir);
          list.forEach(function(filename) {
            var pkgdir = path.join(subpkgdir, filename);
            var stat = fs.statSync(pkgdir);
            if( filename[0] === '.' || !stat.isDirectory() ) return;
            
            if( filename[0] === '@' ) {  // private npm
              fs.readdirSync(pkgdir).forEach(function(_filename) {
                var _pkgdir = path.join(pkgdir, _filename);
                founds.push(_pkgdir);
                listener && listener({
                  name: '@' + filename + '/' + _filename,
                  directory: _pkgdir,
                  parent: dir
                });
                visit(_pkgdir);
              });
            } else {
              founds.push(pkgdir);
              listener && listener({
                name: filename,
                directory: pkgdir,
                parent: dir
              });
              visit(pkgdir);
            }
          });
        }
      }
      
      visitpkgs(path.join(dir, 'node_modules'));
      visitpkgs(path.join(dir, 'web_modules'));
    }
    
    visit(basedir);
    return founds;
  }
};