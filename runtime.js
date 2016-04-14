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
      dirname: function(src) {
        if( src[src.length - 1] === '/' ) return src.substring(0, src.length - 1);
        else return src.substring(0, src.lastIndexOf('/'));
      },
      extname: function(src) {
        var filename = path.filename(src);
        var pos = filename.lastIndexOf('.');
        if( !pos ) return '';
        if( ~pos ) return filename.substring(pos);
        return '';
      },
      filename: function(src) {
        if( endsWith(src, '/') ) return '';
        else return src.substring(src.lastIndexOf('/') + 1);
      }
    };
    
    var cwd = path.normalize('.');
    var current_filename = path.filename(path.normalize());
    var baseModule = (function() {
      var name = config('module.name') || current_filename || 'unnamed';
      var version = config('module.version') || '0.0.0';
      var dir = path.normalize(path.join(path.dirname(currentScript.src), '..', '..'));
      var moduledir = path.normalize(path.join(path.dirname(currentScript.src), '..'));
      
      return {
        name: name,
        version: version,
        dir: dir,
        moduledir: moduledir,
        manifest: {
          name: name,
          version: version,
          webDependencies: {}
        }
      };
    })();
    var debug = config('debug') === 'true' ? true : false;
    
    window.process = {
      env: {
        NODE_ENV: 'development'
      }
    };
    
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
    
    console.log('.html', path.extname('index.html')); // returns '.html'
    console.log('.md', path.extname('index.coffee.md')); // returns '.md'
    console.log('.', path.extname('index.')); // returns '.'
    console.log('(empty)', path.extname('index')); // returns ''
    console.log('(empty)', path.extname('.index')); // return ''
    console.log('(empty)', path.extname('.index.js')); // return ''
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
      console.log('[webmodules] define external', name, src);
      externals[name] = src;
      return this;
    }
    
    function bootstrap(src) {
      var module = loadModule(src);
      var result = load(module.main);
      console.log('[webmodules] bootstrap', src, module.main, result);
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
      fire('exec', {
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
    
    function findModule(src) {
      var paths = src.split('/');
      if( ~paths.indexOf('web_modules') || ~paths.indexOf('node_modules') ) {
        var pos = paths.lastIndexOf('web_modules');
        if( paths.lastIndexOf('node_modules') > pos ) pos = paths.lastIndexOf('node_modules');
        var moduledir = paths.slice(0, pos + 2).join('/');
        return loadModule(moduledir);
      }
      return baseModule;
    }
    
    var fileSupports = ['js', 'json', 'es6', 'ts', 'jsx', 'css', 'html', 'less'];
    function isSupportedFile(src) {
      if( !src ) return false;
      var supported = false;
      fileSupports.forEach(function(ext) {
        if( endsWith(src.toLowerCase(), '.' + ext) ) supported = true;
      });
      return supported;
    }
    
    function validateFilename(src) {
      // - nodejs 의 경우, require('./file') 의 경우 file.js 가 있을 경우 file.js 를 의미하고 디렉토리일경우 ./file/index.js 를
      // 의미하지만, 브라우저상태에서는 파일/디렉토리를 체크할 수 없으므로 파일맵을 만들어서 체크하기 전까지 / 로 끝날경우
      // index.js 를 붙여주고 아닌경우 .js 로 해석하기로...
      // 덧붙여, nodejs 의 경우 test.js 와 test/index.js 가 있을 경우 require('./test') 시 test.js 에 우선권을 준다.
      if( endsWith(src, '/') ) src = src + 'index.js';
      //if( !isSupportedFile(src) ) src = src + '.js';
      if( !path.extname(src) ) src = src + '.js';
      return src;
    }
    
    function load(src) {
      if( !src ) throw new TypeError('[webmodules] missing src');
      if( typeof src !== 'string' ) throw new TypeError('[webmodules] src must be a string');
      
      src = path.normalize(src);
      if( cache[src] ) return cache[src];
      
      console.log('[webmodules] load', src);
      
      // TODO: 파일패턴에 따라 다르게 load 해야한다. (css/html/less/jsx/es6/es7/ts)
      // 일단 js 만 지원. 나머지 확장자는 pass
      if( path.extname(src).toLowerCase() !== '.js' ) {
        console.warn('[webmodules] \'' + path.extname(src) + '\' loader not found', src);
        return cache[src] = {};
      }
      
      // find src's module
      var context = findModule(src);
      var script = loader(src);
      var fn = evaluate(script, src);
      return cache[src] = exec(context, fn, src);
    }
    
    var modulecache = {};
    function loadModule(src) {
      var dir = path.normalize(src);
      if( modulecache[dir] ) return modulecache[dir];
      
      var pkg = JSON.parse(loader(dir + '/package.json'));
      
      // - nodejs(v4.2) 의 경우, pacakage.json 의 main 이 지정되지 않았다면 index.js 를 기본값으로 대체한다.
      // 하지만 main 으로 결정된 파일이 존재하지 않는 경우 Cannot find module 에러를 발생시킨다.
      // - web 의 경우 배열로 지정될 수 있으며, js 외에 html/css 가 함께 지정되어 있기도 하다.
      // - nodejs(v4.2) 의 경우, main 이 js 가 아니라도 파일이 존재하기만 한다면 require.resolve 에서 에러가 나진 않는다.
      // 하지만 require 를 하면 실행을 하면서 문법 오류가 발생한다.
      var main, webmain = pkg.web || pkg.browser;
      if( typeof webmain === 'string' ) {
        main = validateFilename(webmain);
      } else if( Array.isArray(webmain) ) {
        webmain.forEach(function(web) {
          web = validateFilename(web);
          // 간혹 main 에 index.js 를 index 처럼 확장자를 빼고 입력해놓은 경우가 있다. (console-browserify)
          if( endsWith(web, '.js') ) main = web;
          else load(path.normalize(path.join(dir, web)));
        });
        
        if( !main ) main = webmain[0];
      } else {
        main = validateFilename(pkg.main || 'index.js');
      }
      
      if( debug ) console.log('[webmodules] module', pkg.name, dir, main, webmain);
      
      // main 확정 및 존재하는지 로드해본다.
      main = path.normalize(path.join(dir, main));
      loader(main);
      
      var module = modulecache[dir] = {
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
        var moduledir;
        var pd = context.manifest.peerDependencies;
        var wpd = context.manifest.webPeerDependencies;
        if( (pd && pd[name]) || (wpd && wpd[name]) ) {
          moduledir = path.join(context.dir, '..', name);
        } else {
          moduledir = path.join(context.moduledir, name);
        }
        
        /*try {
          return loadModule(moduledir);
        } catch(err) {
          if( debug ) console.error(err);
          throw new Error('Cannot find module \'' + name + '\' : ' + err.message);
        }*/
        return loadModule(moduledir);
      }
      
      function resolve(src) {
        var filepath;
        
        if( !src.indexOf('.') ) {
          filepath = path.normalize(path.join(dir, src));
          //if( debug ) console.log('[webmodules] resolve(path)', src, filepath);
        } else if( !src.indexOf('/') ) {
          filepath = path.normalize(src);
          //if( debug ) console.log('[webmodules] resolve(abspath)', src, filepath);
        } else if( externals[src] ) {
          filepath = externals[src];
          //if( debug ) console.log('[webmodules] resolve(external)', src, filepath);
        } else {
          // sub module
          if( ~src.indexOf('/') ) {
            var modulename = src.substring(0, src.indexOf('/'));
            var subpath = src.substring(src.indexOf('/') + 1) || '';
            if( !subpath ) filepath = submodule(src).main;
            else filepath = path.normalize(path.join(submodule(modulename).dir, subpath));
            //if( debug ) console.log('[webmodules] resolve(sub/path)', src, filepath);
          } else {
            filepath = submodule(src).main;
            //if( debug ) console.log('[webmodules] resolve(sub)', src, filepath);
          }
        }
        
        if( debug ) console.log('[webmodules] resolve', src, validateFilename(filepath));
        
        return validateFilename(filepath);
      }
      
      function require(src) {
        return load(resolve(src));
      }
      
      require.dir = dir;
      require.module = context;
      require.resolve = resolve;
      return require;
    }
    
    // pack webmodule
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
    
    // bootstrap module loading
    WebModules.bootstrap(path.join(path.dirname(currentScript.src), 'web_modules', 'node-libs-browser'));
    
    // exports to global & scanning
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


