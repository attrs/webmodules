(function() {
  var process;
  function __evaluate(script, src, exports, strict) {
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
    
    var LABEL = '[webmodules] ';
    var WEB_MODULES = 'web_modules';
    var NODE_MODULES = 'node_modules';
    var webmodules;
    
    var currentScript = window.document._currentScript || window.document.currentScript || (function() {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();
    
    function config(name, alt) {
      var root = document.head.querySelector('meta[name="webmodules.' + name + '"][content]');
      return (root && root.getAttribute('content')) || alt;
    }
    
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
          if( typeof arg !== 'string' ) throw new Error('arguments must be a string');
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
        else return src.substring(0, src.lastIndexOf('/')) || '/';
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
    
    var fs = (function() {
      var files = {};
      
      return {
        write: function(src, contents) {
          src = path.normalize(src);
          if( debug ) console.log(LABEL + 'fs write', src);
          files[src] = contents;
          return this;
        },
        read: function(src) {
          if( !src ) return null;
          src = path.normalize(src);
          return files[src];
        },
        load: function(src) {
          if( !src ) throw new Error(LABEL + 'missing src');
          var text = files[path.normalize(src)], error;
          if( text == null ) {
            var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
            xhr.open('GET', src, false);
            xhr.onreadystatechange = function(e) {
              if( this.readyState == 4 && this.status == 200 ) text = this.responseText;
              else error = this.responseText;
            };
            xhr.send();
        
            if( error ) throw new Error('Cannot find module \'' + src + '\': ' + error);
            text = text.split('//# sourceMappingURL=').join('//'); // TODO: validate sourcemap URL
          }
          return text;
        }
      }
    })();
    
    function loader(src, type) {
      var exists, ext = path.extname(src).toLowerCase();
      if( webmodules ) {
        if( type ) exists = webmodules.loader.get(type) ? true : false;
        else exists = webmodules.loader.exists(src);
        
        if( !exists && !~['.js', '.json'].indexOf(ext) ) {
          console.warn(LABEL + 'unsupported type \'' + path.extname(src) + '\'', src);
        }
      }
      
      if( exists ) return webmodules.loader.load(src, type);
      else if( ext === '.json' ) return { exports: JSON.parse(fs.load(src)) };
      else return { code: fs.load(src) };
    }
    
    var cwd = path.normalize('.');
    var basePackage = (function() {
      var name = config('package.name') || path.filename(path.normalize()) || 'index.html';
      var version = config('package.version') || '0.0.0';
      var pkgdir = path.normalize(path.join(path.dirname(currentScript.src), '..'));
      var dir = path.normalize(path.join(pkgdir, '..'));
      
      return {
        name: name,
        version: version,
        dir: dir,
        pkgdir: pkgdir,
        manifest: {
          name: name,
          version: version
        }
      };
    })();
    var debug = config('debug') === 'true' ? true : false;
    
    if( debug ) console.log(LABEL + 'base pacakge', path.join(path.dirname(currentScript.src), '..', '..'), basePackage);
    
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
    
    var events = (function() {
      var listeners = {};
      
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
      
      return {
        fire: fire,
        on: on,
        once: once,
        off: off
      }
    })();
    
    function validateFilename(src) {
      // - nodejs 의 경우, require('./file') 의 경우 file.js 가 있을 경우 file.js 를 의미하고 디렉토리일경우 ./file/index.js 를
      // 의미하지만, 브라우저 상태에서는 체크할 수 없으므로 package.json 설치시 TODO 파일맵을 만들어서 체크하기 전까지
      // '/' 로 끝날 경우엔 index.js 를 붙여주고 아닌경우 .js 로 해석하기로 한다.
      // 덧붙여, nodejs 의 경우 test.js 와 test/index.js 가 있을 경우 require('./test') 시 test.js 에 우선권을 준다.
      if( endsWith(src, '/') ) src = src + 'index.js';
      //if( !isSupportedFile(src) ) src = src + '.js';
      if( !path.extname(src) ) src = src + '.js';
      return src;
    }
    
    // commonjs implementation
    var externals = {};
    function defineExternal(name, src, options) {
      if( !name ) throw new TypeError(LABEL + 'missing name');
      if( typeof name !== 'string' ) throw new TypeError(LABEL + 'name must be a string');
      
      options = options || {};
      if( debug ) console.log(LABEL + 'external', name, src, options.isPackage ? 'package' : 'module');
      
      if( options.isPackage ) externals[name] = loadPackage(src);
      else externals[name] = src;
      
      return this;
    }
    
    function bootstrap(src) {
      var result = load(src);
      if( debug ) console.log(LABEL + 'bootstrap', src, result);
      for( var k in result ) if( result.hasOwnProperty(k) && result[k] ) defineExternal(k, result[k]);
      return this;
    }
    
    function evaluate(script, src, exports, strict) {
      return __evaluate(script, src, exports, strict);
    }
    
    function exec(fn, filename) {
      if( typeof fn !== 'function' ) throw new TypeError(LABEL + 'exec: module must be a function');
      if( !filename ) throw new TypeError(LABEL + 'exec: missing filename');
      
      if( debug ) console.log(LABEL + 'exec', filename);
      
      /* TODO: 
      module.parent 에 대해서. (socketio-browser 모듈에서 발생한 문제)
      nodejs 의 경우 호출한 Module 객체를 전달한다.
      Module {
        id: '.',
        exports: {...},
        parent: null,
        filename: '/Volumes/git/attrs/webmodules/examples/runtime/lib/index.js',
        loaded: false,
        children: [Module ...]
        paths: 
         [ '/Volumes/git/attrs/webmodules/examples/runtime/lib/node_modules',
           '/Volumes/git/attrs/webmodules/examples/runtime/node_modules',
           '/Volumes/git/attrs/webmodules/examples/node_modules',
           '/Volumes/git/attrs/webmodules/node_modules',
           '/Volumes/git/attrs/node_modules',
           '/Volumes/git/node_modules',
           '/Volumes/node_modules',
           '/node_modules' ]
        }
      */
      
      var module = {parent:{}};
      var exports = module.exports = {};
      var global = window;
      var __filename = filename;
      var __dirname = path.dirname(__filename);
      var require = createRequire(__dirname);
      
      events.fire('before-exec', {
        fn: fn,
        exports: exports,
        require: require,
        filename: __filename,
        dirname: __dirname
      });
      fn.call(exports, exports, require, module, __filename, __dirname, global);
      events.fire('exec', {
        fn: fn,
        exports: exports,
        require: require,
        filename: __filename,
        dirname: __dirname
      });
      return module.exports || exports || {};
    }

    var cache = {};
    function load(src, options) {
      if( !src ) throw new TypeError(LABEL + 'missing src');
      if( typeof src !== 'string' ) throw new TypeError(LABEL + 'src must be a string');
      
      src = path.normalize(src);
      if( cache[src] ) return cache[src];
      
      // find src's module
      var pkg = getPackage(src);
      if( debug ) console.log(LABEL + 'load', src, pkg.name);
      
      if( pkg.dir === src ) src = pkg.main;
      
      var loaded = loader(src);
      if( loaded.exports ) {
        return cache[src] = loaded.exports;
      } else if( loaded.code ) {
        var fn = evaluate(loaded.code, src, options && options.exports, options && options.strict);
        return cache[src] = exec(fn, src);
      } else {
        throw new Error(LABEL + 'load error: ' + src);
      }
    }
    
    var packageCache = {};
    function loadPackage(src) {
      var dir = path.normalize(src);
      if( packageCache[dir] ) return packageCache[dir];
      
      var manifest = loader(dir + '/package.json').exports;
      
      // 각 package 들이 일정한 표준을 따르고 있지 않아서 여러가지 문제가 발생할 수 있다.
      // 여러가지 상황을 고려해 다음과 같은 원리로 로딩하기로 한다.
      // browser 필드가 있을 경우
      //   browser 필드가 string 인 경우 main 으로 취급
      //   browser 필드가 array 인 경우 첫번째로 발견한 js 파일을 main 으로 취급하고 나머지를 리소스로 로드한다.
      //   browser 필드가 object 인 경우 main 을 main 으로 취급하고 object 값에 따라 리소스를 alias 한다.
      // main 과 browser 필드 모두 없을 경우
      //   index.js 를 main 으로 한다.
      // main 필드가 있는 경우
      //   main 필드가 string 인 경우에만 main 으로 취급
      // 여러가지 처리결과 main 을 확정할 수 없는 경우 index.js 를 main 으로 한다.
      // 그럼에도 불구하고 index.js 가 없는 경우 패키지는 없는 것과 같다. (이 경우 wpm 으로 설치시 자동으로 빈파일로 채워준다)
      // main 으로 확정된 파일이 js 가 아닌 경우도 상관없이 main 으로 취급한다. 파일패턴에 따라 그에 맞는 loader 가 작동.
      // jspm 필드는 추후 지원하기로 한다.
      
      // - nodejs(v4.2) 의 경우, pacakage.json 의 main 이 지정되지 않았다면 index.js 를 기본값으로 대체한다.
      // 하지만 main 으로 결정된 파일이 존재하지 않는 경우 Cannot find module 에러를 발생시킨다.
      // - web 의 경우 배열로 지정될 수 있으며, js 외에 html/css 가 함께 지정되어 있기도 하다.
      // - nodejs(v4.2) 의 경우, main 이 js 가 아니라도 파일이 존재하기만 한다면 require.resolve 에서 에러가 나진 않는다.
      // 하지만 require 를 하면 실행을 하면서 문법 오류가 발생한다.
      var main, aliases = {}, resources = manifest.web;
      if( typeof manifest.browser === 'string' ) {
        main = validateFilename(manifest.browser);
      } else if( manifest.browser && typeof browser === 'object' ) {
        main = manifest.main;
        aliases = manifest.browser;
      } else {
        main = manifest.main;
      }
      
      // TODO: package.json 의 web 필드를 resources 로 저장해놓는다.
      if( resources ) {
        if( typeof resources === 'string' ) resources = [resources];
        if( !Array.isArray(resources) ) resources = null;
      }
      
      // TODO: main 이 없을때 web 필드를 해석하는게 옳은지에 대해서는 생각해볼 필요가 있다. (호환성 문제)
      // bower 등으로 설치한 경우 main 을 확정할 수 없을때는 require('pkg/subpath') 형태로 개발자가 직접 지정하는게 맞는것 같다.
      // 어쨋든, main 을 확정할 수 없을 경우 package.json/web 필드를 이용한다.
      // 배열일 경우, 가장 먼저 발견된 js 를 main 으로 하고, js 가 없을 경우, 첫번째 배열요소를 main 으로 선택한다.
      if( !main && resources ) {
        resources.forEach(function(src) {
          if( endsWith(src, '.js') && !main ) main = src;
        });
        if( !main ) main = resources[0];
      }
      
      if( debug ) console.log(LABEL + 'package loaded', manifest.name, dir, main);
      
      // main 확정
      main = validateFilename(path.normalize(path.join(dir, main || 'index.js')));
      
      // TODO: check file exists, package.json 의 _files 와 _directories 를 기준으로 체크한다.
      // _files 혹은 _directories 가 지정되지 않았을 경우 존재하는 것으로 간주한다.
      
      var pkg = packageCache[dir] = {
        name: manifest.name,
        version: manifest.version,
        dir: dir,
        main: main,
        manifest: manifest,
        aliases: aliases,
        resources: resources
      };
      
      return pkg;
    }
    
    function getPackage(src) {
      var paths = src.split('/');
      if( ~paths.indexOf(WEB_MODULES) || ~paths.indexOf(NODE_MODULES) ) {
        var pos = paths.lastIndexOf(WEB_MODULES);
        if( paths.lastIndexOf(NODE_MODULES) > pos ) pos = paths.lastIndexOf(NODE_MODULES);
        var dir = paths.slice(0, pos + 2).join('/');
        return loadPackage(dir);
      }
      return basePackage;
    }
    
    function createRequire(dir) {
      if( !dir ) throw new Error(LABEL + 'create require: missing dir');
      var pkg = getPackage(dir);
      
      if( debug ) console.log(LABEL + 'create require', dir, pkg.name);
      function submodule(name) {
        var subpkgdir;
        var manifest = pkg.manifest || {};
        var bpd = manifest.browserPeerDependencies;
        var pd = manifest.peerDependencies;
        var bdep = manifest.browserDependencies;
        var dep = manifest.dependencies;
        
        if( bpd && bpd[name] ) {
          subpkgdir = path.join(basePackage.pkgdir, name);
        } else if( pd && pd[name] ) {
          subpkgdir = path.join(basePackage.pkgdir, name);
        } else if( bdep && bdep[name] ) {
          subpkgdir = pkg.pkgdir ? path.join(pkg.pkgdir, name) : path.join(pkg.dir, WEB_MODULES, name);
        } else if( dep && dep[name] ) {
          subpkgdir = pkg.pkgdir ? path.join(pkg.pkgdir, name) : path.join(pkg.dir, NODE_MODULES, name);
        } else {
          subpkgdir = pkg.pkgdir ? path.join(pkg.pkgdir, name) : path.join(pkg.dir, NODE_MODULES, name);
        }
        
        if( debug ) console.log(LABEL + 'submodule[' + name + '] dir:', subpkgdir);
        
        if( debug ) return loadPackage(subpkgdir);
        
        try {
          return loadPackage(subpkgdir);
        } catch(err) {
          if( debug ) console.error(err);
          throw new Error('Cannot find module \'' + name + '\' : ' + err.message);
        }
      }
      
      function resolve(src) {
        var filepath, srccase = 0;
        
        if( !src.indexOf('.') ) {
          filepath = path.normalize(path.join(dir, src));
          srccase = 1;
        } else if( !src.indexOf('/') ) {
          filepath = path.normalize(src);
          srccase = 2;
        } else {
          // sub module
          if( ~src.indexOf('/') ) {
            var modulename = src.substring(0, src.indexOf('/'));
            var subpath = src.substring(src.indexOf('/') + 1) || '';
            var module = externals[modulename] || submodule(modulename);
            
            if( typeof module === 'string' ) filepath = !subpath ? module : path.normalize(path.join(module, subpath));
            else if( !subpath ) filepath = module.main;
            else filepath = path.normalize(path.join(module.dir, subpath));
            srccase = 3;
          } else {
            var module = externals[src] || submodule(src);
            
            if( typeof module === 'string' ) filepath = module;
            else filepath = module.main;
            srccase = 4;
          }
        }
        
        if( !filepath ) throw new Error('Cannot find module \'' + src + ' \' : package.json main not defined');
        if( debug ) console.log(LABEL + 'resolve(' + srccase + ')', src, validateFilename(filepath));
        
        return validateFilename(filepath);
      }
      
      function require(src) {
        return load(resolve(src));
      }
      
      require.directory = dir;
      require.package = pkg;
      require.resolve = resolve;
      return require;
    }
    
    // pack webmodule
    var WebModules = {
      require: createRequire(basePackage.dir, basePackage),
      createRequire: createRequire,
      bootstrap: bootstrap,
      defineExternal: defineExternal,
      load: load,
      loadPackage: loadPackage,
      evaluate: evaluate,
      exec: exec,
      modules: cache,
      packages: packageCache,
      externals: externals,
      fs: fs,
      on: events.on,
      once: events.once,
      off: events.off
    };
    
    // bootstrap module loading
    WebModules.bootstrap(path.join(path.dirname(currentScript.src), NODE_MODULES, 'node-libs-browser'));
    process = WebModules.require('process');
    webmodules = WebModules.require('webmodules');
    webmodules.runtime(WebModules);
    
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
        var bootstrap = el.hasAttribute('data-bootstrap');
        var src = el.getAttribute('data-src');
        var filename = el.getAttribute('data-filename');
        var name = el.getAttribute('data-as');
        var script = el.textContent || el.innerText;
        var exec = el.hasAttribute('data-exec');
        var strict = el.hasAttribute('data-strict');
        
        var exports = el.getAttribute('data-exports');
        var isPackage = el.hasAttribute('data-package') || el.hasAttribute('data-module'); // deprecated : data-module
        
        if( !src ) {
          // write to virtual fs
          src = path.join(cwd, filename || ('script-' + Math.random() + '.js'));
          WebModules.fs.write(src, script || '//empty module');
        }
        
        if( bootstrap ) {
          if( !src ) WebModules.bootstrap(src);
          else WebModules.bootstrap(src);
        } else if( name ) {
          WebModules.defineExternal(name, src, {exports: exports, isPackage: isPackage});
          if( exec ) WebModules.require(name);
        } else {
          WebModules.load(src, {strict:strict});
        }
      }
      
      // scan
      WebModules.scan = function() {
        var doc = document.currentScript && document.currentScript.ownerDocument || document;
        
        // put env
        [].forEach.call(doc.querySelectorAll('meta[name^="webmodules.env."]'), function(el) {
          var name = el.getAttribute('name');
          var content = el.getAttribute('content');
          process.env[name.substring(15)] = content;
        });
        
        // bootstrap
        [].forEach.call(doc.querySelectorAll('script[type$="/commonjs"][data-bootstrap]'), function(el) {
          resolve(el);
        });
        
        // modules
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


