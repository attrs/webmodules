(function() {
  if( typeof window !== 'object' ) throw new Error('[webmodules] browser only');
  
  function evaluate(script, src, exports, strict) {
    var evaluate = undefined;
    if( typeof exports === 'string' ) script += '\nmodule.exports = ' + exports + ';';
    script = '/* ' + (src ? src : window.location.path) + ' */\
    script = undefined, src = undefined, strict = undefined,\
    (function(exports, require, module, __filename, __dirname, global) { ' + script + '\n});';
    
    if( strict ) {
      var module;
      (function() {
        var window = undefined, document = undefined, location = undefined, history = undefined;
        module = eval(script);
      })();
      return module;
    }
    return eval(script);
  }
  
  (function() {
    "use strict";
    
    var currentScript = window.document._currentScript || window.document.currentScript || (function() {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();
    
    function config(name, alt) {
      var root = document.head.querySelector('meta[name="webmodules.' + name + '"][content]');
      return (root && root.getAttribute('content')) || alt;
    };
    
    function loader(src) {
      var text, error;
      var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
      xhr.open('GET', src, false);
      xhr.onreadystatechange = function(e) {
        if( this.readyState == 4 && this.status == 200 ) text = this.responseText;
        else error = this.responseText;
      };
      xhr.send();

      if( error ) throw new Error('Cannot find module \'' + src + '\': ' + error);
      text = text.split('//# sourceMappingURL=').join('//'); // TODO: validate sourcemap URL
      return text;
    };
    
    function endsWith(str, word) {
      if( !str ) return false;
      if( str === word ) return true;
      var i = str.lastIndexOf(word);
      return i > 0 && i === str.length - word.length;
    }
    
    var path = {
      join: function() {
        var filepath = '';
        [].forEach.call(arguments, function(arg) {
          if( !arg ) return;
          if( typeof arg !== 'string' ) throw new Error('path.join arguments must be a string');
          arg = arg.trim();
          
          if( filepath && arg[0] === '/' ) arg = arg.substring(1, arg.length);
          if( filepath && !endsWith(filepath, '/') ) filepath += '/';
          if( arg === '..' || arg === '.' ) arg = arg + '/';
            
          filepath += arg;
          filepath.split('//').join('/');
        });
        return filepath;
      },
      normalize: function(src, doc) {
        if( !src || typeof src !== 'string' ) src = (doc || document).URL;
        var a = (doc || document).createElement('a');
        a.href = src || '';
        return a.pathname;
      },
      dirname: function(filename) {
        if( filename[filename.length - 1] === '/' ) return filename.substring(0, filename.length - 1);
        else return filename.substring(0, filename.lastIndexOf('/'));
      },
      filename: function(filename) {
        if( endsWith(filename, '/') ) return '';
        else return filename.substring(filename.lastIndexOf('/') + 1);
      }
    };
    
    var cwd = path.normalize('.');
    var current_filename = path.filename(path.normalize());
    var baseModule = (function() {
      var name = config('module.name') || current_filename || 'unnamed';
      var version = config('module.version') || '0.0.0';
      var dir = path.normalize(path.join(path.dirname(currentScript.src), '..', '..'));
      var main = path.normalize(path.join(cwd, 'index.js'));
      var moduledir = path.normalize(path.join(path.dirname(currentScript.src), '..'));
      
      return {
        name: name,
        version: version,
        dir: dir,
        main: path.normalize(path.join(cwd, 'index.js')),
        moduledir: moduledir,
        manifest: {
          name: name,
          version: version,
          webDependencies: {}
        }
      };
    })();
    
    //console.log('baseModule', path.join(path.dirname(currentScript.src), '..', '..'), baseModule);
    
    /*console.log(path.join('a', 'b', 'c'));
    console.log(path.join('a', '/b/', '/c'));
    console.log(path.join('/a', '/b/', '/c'));
    console.log(path.join('/a', '/b/', '/c/'));
    console.log(path.normalize('/../a/b/c/../index.js'));
    console.log(path.dirname(path.normalize('/../a/b/c/../index.js')));
    console.log(path.filename(path.normalize('/../a/b/c/../index.js')));
    
    console.log('endswith', endsWith('testat.js', '.js'));
    console.log('endswith', endsWith('testat.js', 's'));
    console.log('endswith', endsWith('testat.js', 'a'));
    console.log('endswith', endsWith('testat.js', 'testat.js'));
    console.log('endswith', endsWith('testat.js', 'estat.js'));
    */
    
    function isFile(src) {
      return endsWith(src.toLowerCase(), '.js') || endsWith(src.toLowerCase(), '.json');
    }
    
    // commonjs implementation
    var externals = {}, cache = {}, listeners = {}, virtualfs = {};
    
    function fire(type, detail) {
      var self = this;
      (listeners[type] || []).forEach(function(listener) {
        listener.call(self, {
          type: type,
          detail: detail
        });
      });
      return this;
    }
    
    function on(type, fn) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
      return this;
    }
    
    function once(type, fn) {
      var self = this;
      var wrap = function(e) {
        off(type, wrap);
        return fn.call(self, e);
      };
      on(type, wrap);
      return this;
    }
    
    function off(type, fn) {
      var fns = this.listeners[type];
      if( fns )
        for(var i;~(i = fns.indexOf(fn));) fns.splice(i, 1);
    
      return this;
    }
    
    function define(name, src) {
      if( !name ) throw new TypeError('[webmodules] missing name');
      if( typeof name !== 'string' ) throw new TypeError('[webmodules] name must be a string');
      //console.log('define', name, src);
      externals[name] = src;
      return this;
    }
    
    function bootstrap(src) {
      var module = loadModule(src);
      var result = load(module, module.main);
      for( var k in result ) if( result.hasOwnProperty(k) && result[k] ) define(k, result[k]);
      return this;
    }
    
    function exec(context, fn, src) {
      if( typeof fn !== 'function' ) throw new TypeError('[webmodules] module must be a function');
      
      var module = {};
      var exports = module.exports = {};
      var global = window;
      var __filename = src || normalize('');
      var __dirname = path.dirname(__filename);
      var require = createRequire(__dirname, context);
      
      //console.log('exec', src, __filename, __dirname, definition);
      
      fire('before-exec', {
        fn: fn,
        src: src,
        exports: exports,
        require: require,
        module: module,
        filename: __filename,
        dirname: __dirname
      });
      fn.call(exports, exports, require, module, __filename, __dirname, global);
      fire('after-exec', {
        fn: fn,
        src: src,
        exports: exports,
        require: require,
        module: module,
        filename: __filename,
        dirname: __dirname
      });
      return module.exports || exports || {};
    }
    
    function load(context, src) {
      if( !src ) throw new TypeError('[webmodules] missing src');
      if( typeof src !== 'string' ) throw new TypeError('[webmodules] src must be a string');
      
      src = path.normalize(src);
      if( cache[src] ) return cache[src];
      
      var script = loader(src);
      var fn = evaluate(script, src);
      return cache[src] = exec(context, fn, src);
    }
    
    var modules = {};
    function loadModule(src) {
      var dir = path.normalize(src);
      var pkg = JSON.parse(loader(dir + '/package.json'));
      
      if( pkg.web && typeof pkg.web !== 'string' ) pkg.web = null;
      if( pkg.main && typeof pkg.main !== 'string' ) pkg.main = null;
      
      var main = path.normalize(path.join(dir, pkg.web || pkg.main || 'index.js'));
      
      var module = {
        name: pkg.name,
        version: pkg.version,
        dir: dir,
        main: main,
        manifest: pkg,
        moduledir: path.join(dir, pkg.webDependencies ? 'web_modules' : 'node_modules')
      };
      
      return module;
    }
    
    function createRequire(dir, context) {
      //console.log('create require', dir, context.name);
      
      function submodule(name) {
        var moduledir = path.join(context.moduledir, name);
        return loadModule(moduledir);
      }
      
      function resolve(src) {
        var filepath, module;
        
        if( !src.indexOf('.') ) {
          filepath = path.normalize(path.join(dir, src));
        } else if( !src.indexOf('/') ) {
          filepath = path.normalize(src);
        } else if( externals[src] ) {
          filepath = externals[src];
        } else {
          // sub module
          if( ~src.indexOf('/') ) {
            var modulename = src.substring(0, src.indexOf('/'));
            var subpath = src.substring(src.indexOf('/') + 1) || '';
            if( !endsWith(subpath, '.js') && !endsWith(subpath, '.json') ) subpath = path.join(subpath, 'index.js');
            module = submodule(modulename);
            filepath = path.normalize(path.join(module.dir, subpath));
          } else {
            module = submodule(src);
            filepath = module.main;
          }
        }
        
        if( !module ) {
          var paths = filepath.split('/');
          if( ~paths.indexOf('web_modules') || ~paths.indexOf('node_modules') ) {
            var moduledir, pos = paths.lastIndexOf('web_modules');
            if( paths.lastIndexOf('node_modules') > pos ) pos = paths.lastIndexOf('node_modules');
            
            //console.log('paths', paths, pos);
            
            moduledir = paths.slice(0, pos + 2).join('/');
            
            //console.log('module load!', filepath, moduledir);
            module = loadModule(moduledir);
          } else module = context;
        }
        
        //console.log('resolved', src, filepath);
        return {
          module: module,
          filepath: filepath
        }
      }
      
      function require(src) {
        var resolved = resolve(src);
        return load(resolved.module, resolved.filepath);
      }
      
      require.dir = dir;
      require.module = context;
      require.resolve = function(src) {
        return resolve(src).filepath;
      };
      return require;
    }
    
    var WebModules = {
      require: createRequire(baseModule.dir, baseModule),
      bootstrap: bootstrap,
      //define: define,
      evaluate: evaluate,
      exec: exec,
      cache: cache,
      on: on,
      once: once,
      off: off
    };
    
    WebModules.bootstrap(path.join(path.dirname(currentScript.src), 'web_modules', 'node-libs-browser'));
    
    (function() {
      var require = typeof window.require === 'function' ? window.require : null;
      
      window.WebModules = WebModules;
      window.require = function(src) {
        if( arguments.length === 1 && typeof src === 'string' ) return WebModules.require(src);
        return require ? require.apply(window, arguments) : null;
      };
      
      window.require.resolve = WebModules.require.resolve;
      window.require.base = WebModules.require.base;
      
      function resolve(el) {
        if( el.__webmodules_managed__ ) return;
        el.__webmodules_managed__ = true;
        var src = el.getAttribute('data-src');
        var name = el.getAttribute('data-as');
        var evalstring = el.getAttribute('data-eval');
        var type = el.getAttribute('data-type');
        var exports = el.getAttribute('data-export');
        var bootstrap = el.getAttribute('data-bootstrap') !== null ? true : false;
        var exec = el.getAttribute('data-exec') !== null ? true : false;
        var script = el.textContent || el.innerText;
        
        if( src ) src = path.normalize(src);
        if( evalstring ) script = 'module.exports = ' + evalstring + ';';
        
        if( bootstrap ) WebModules.bootstrap(src);
        else if( name && src ) WebModules.define(name, { src: src, tag: el, exports: exports});
        else if( name && script ) WebModules.define(name, { type: 'script', script: script, exports: exports, tag: el});
        else if( src ) return WebModules.require(src);
        else if( script ) return WebModules.exec({ type: 'script', script: script, exports: exports, tag: el});
        else return;
        
        if( exec ) WebModules.require(name);
      }
      
      // scan
      WebModules.scan = function() {
        var doc = document.currentScript && document.currentScript.ownerDocument || document;
        [].forEach.call(doc.querySelectorAll('script[type$="/commonjs"][data-bootstrap]'), function(el) {
          resolve(el);
        });
        [].forEach.call(doc.querySelectorAll('script[type$="/commonjs"]'), function(el) {
          resolve(el);
        });
      }
      
      WebModules.scan();
      window.addEventListener('DOMContentLoaded', function(e) {
        WebModules.scan();
      });
    })();
  })();
})();


