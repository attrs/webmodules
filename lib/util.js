var fs = require('fs');
var path = require('path');

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
          if( !fs.existsSync(file) ) return;
          
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