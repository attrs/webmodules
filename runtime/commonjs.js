(function() {
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
    
    var g, loader, normalize, document, currentScript;
    
    // loader & global will be determined according to the platform
    if( typeof window === 'object' ) {
      if( window.CommonJS ) return;
      currentScript = window.document._currentScript || window.document.currentScript || (function() {
        var scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
      })();
      
      g = window, document = window.document, loader = function(src) {
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
      
      normalize = function(src, doc) {
        if( !src || typeof src !== 'string' ) src = (doc || document).URL;
        var a = (doc || document).createElement('a');
        a.href = src || '';
        return a.pathname;
      }
    } else {
      try {
        var path = require('path');
        var fs = require('fs');
        
        g = global, loader = function(src) {
          // TODO : loading module from filesystem & return file content text
        };
        
        normalize = function (src) {
          return path.normalize(src);
        }
      } catch(err) {}
    }
    
    function dirname(filename) {
      if( filename[filename.length - 1] === '/' ) return filename.substring(0, filename.length - 1);
      else return filename.substring(0, filename.lastIndexOf('/'));
    }
    
    function endsWith(str, word) {
      if( !str ) return false;
      var i = str.toLowerCase().indexOf(word);
      return i > 0 && i === str.length - word.length;
    }
    
    function isFile(src) {
      return endsWith(src.toLowerCase(), '.js') || endsWith(src.toLowerCase(), '.json');
    }
    
    
    // commonjs implementation
    var defines = {}, cache = {}, listeners = {}, virtualfs = {};
    
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
    
    function define(name, definition) {
      if( typeof definition === 'string' ) definition = {src:definition};
      if( !name ) throw new TypeError('[cjs] missing name');
      if( typeof name !== 'string' ) throw new TypeError('[cjs] name must be a string');
      
      if( definition.type === 'script' ) {
        if( definition.script && typeof definition.script !== 'string' ) throw new TypeError('[cjs] script must be a string');
        definition.src = '/virtualfs/scripts/' + name + '/index.js';
        virtualfs[definition.src] = definition.script;
      } else {
        if( !definition.src || typeof definition.src !== 'string' ) throw new TypeError('[cjs] src must be a string');
        definition.src = normalize(definition.src);
      }
      
      definition.name = name;
      defines[name] = definition;
      return this;
    }
    
    function exec(fn, src, definition) {
      if( typeof fn !== 'function' ) throw new TypeError('[cjs] module must be a function');
      
      var module = {};
      var exports = module.exports = {};
      var global = g;
      var __filename = src || normalize('');
      var __dirname = dirname(__filename);
      var require = createRequire(__dirname);
      
      //console.log('exec', src, __filename, __dirname, definition);
      
      fire('before-exec', {
        fn: fn,
        src: src,
        definition: definition || {},
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
        definition: definition || {},
        exports: exports,
        require: require,
        module: module,
        filename: __filename,
        dirname: __dirname
      });
      return module.exports || exports || {};
    }
    
    function bootstrap(src) {
      var o = load(src);
      for( var k in o ) if( o.hasOwnProperty(k) && o[k] ) define(k, o[k]);
      return this;
    }
    
    function load(src, definition) {
      if( !src ) throw new TypeError('[cjs] missing src');
      if( typeof src !== 'string' ) throw new TypeError('[cjs] src must be a string');
      
      src = normalize(src);
      if( cache[src] ) return cache[src];
      
      //console.log('load', src, definition);
      var script = virtualfs[src] || loader(src);
      var fn = evaluate(script, src, definition && definition.exports);
      return cache[src] = exec(fn, src, definition);
    }
    
    function createRequire(dir) {
      function validatefile(src) {
        var s = src.toLowerCase();
        if( !(endsWith(s, '.js') || endsWith(s, '.json')) ) return src + '/index.js';
        return src;
      }
      
      function getBase() {
        var base = dir;
        if( !base ) {
          var cs = document._currentScript || document.currentScript;
          if( cs && currentScript && cs.src && cs.src !== currentScript.src ) {
            base = cs.src ? dirname(cs.src) : dirname(document.URL);
          } else {
            base = dirname(document.URL);
          }
        }
        
        if( !base ) throw new Error('[cjs] cannot resolve require base');
        if( !endsWith(base, '/') ) base = base + '/';
        return base;
      }
      
      function resolve(src) {
        var base = getBase();
        if( defines[src] ) {
          return normalize(validatefile(defines[src].src));
        } else if( !src.indexOf('.') ) {
          return normalize(base + validatefile(src));
        } else if( !src.indexOf('/') ) {
          return normalize(validatefile(src));
        } else if( ~src.indexOf('/') ) {
          var modulename = src.substring(0, src.indexOf('/'));
          var submodule = src.substring(src.indexOf('/') + 1) || 'index.js';
          var moduledir = dirname(resolve(modulename));
          return normalize(moduledir + '/' + validatefile(submodule));
        } else {
          // TODO: package.json 을 읽어서 path 를 결정해야 한다. 일단 index.js 로 퉁침.
          return normalize(base + 'node_modules/' + validatefile(src));
          //throw new Error('Cannot find module \'' + src + '\'');
        }
      }
      
      function require(src) {
        //console.log('require', {base:base, src:src, resolved:resolve(src)});//, cache);
        return load(resolve(src), defines[src]);
      }
      
      require.base = getBase;
      require.resolve = resolve;
      return require;
    }
    
    var cjs = {
      require: createRequire(),
      bootstrap: bootstrap,
      define: define,
      evaluate: evaluate,
      exec: exec,
      cache: cache,
      scan: function() {},
      on: on,
      once: once,
      off: off
    };
    
    
    // export
    if( typeof window === 'object' ) {
      var require = typeof window.require === 'function' ? window.require : null;
      
      window.CommonJS = cjs;
      window.require = function(src) {
        if( arguments.length === 1 && typeof src === 'string' ) return cjs.require(src);
        return require ? require.apply(window, arguments) : null;
      };
      
      window.require.resolve = cjs.require.resolve;
      window.require.base = cjs.require.base;
      
      var cs;
      cjs.on('before-exec', function(e) {
        var tag = e.detail.definition.tag;
        if( tag ) {
          cs = document._currentScript || document.currentScript;
          document._currentScript = tag;
        }
      });
      
      cjs.on('after-exec', function(e) {
        document._currentScript = cs;
      });
      
      cjs.bootstrap(dirname(currentScript.src) + '/node-libs-browser/index.js');
      
      function resolve(el) {
        if( el.__cjs_managed__ ) return;
        el.__cjs_managed__ = true;
        var src = el.getAttribute('data-src');
        var name = el.getAttribute('data-as');
        var evalstring = el.getAttribute('data-eval');
        var type = el.getAttribute('data-type');
        var exports = el.getAttribute('data-export');
        var bootstrap = el.getAttribute('data-bootstrap') !== null ? true : false;
        var exec = el.getAttribute('data-exec') !== null ? true : false;
        var script = el.textContent || el.innerText;
        
        if( src ) src = normalize(src);
        if( evalstring ) script = 'module.exports = ' + evalstring + ';';
        
        if( bootstrap ) cjs.bootstrap(src);
        else if( name && src ) cjs.define(name, { src: src, tag: el, exports: exports});
        else if( name && script ) cjs.define(name, { type: 'script', script: script, exports: exports, tag: el});
        else if( src ) return cjs.require(src);
        else if( script ) return cjs.exec({ type: 'script', script: script, exports: exports, tag: el});
        else return;
        
        if( exec ) cjs.require(name);
      }
      
      // scan tags
      cjs.scan = function() {
        var doc = document.currentScript && document.currentScript.ownerDocument || document;
        [].forEach.call(doc.querySelectorAll('script[type$="/commonjs"][data-bootstrap]'), function(el) {
          resolve(el);
        });
        [].forEach.call(doc.querySelectorAll('script[type$="/commonjs"]'), function(el) {
          resolve(el);
        });
      };
      
      // scan
      cjs.scan();
      window.addEventListener('DOMContentLoaded', function(e) {
        cjs.scan();
      });
    } else if( typeof global === 'object' && typeof module === 'object' ) {
      module.exports = cjs;
    }
  })();
})();


