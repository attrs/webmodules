(function() {
  var process = {
    nextTick: function(fn) {
      setTimeout(fn, 0);
    },
    env: {
      NODE_ENV: 'development'
    }
  };
  
  function __evaluate(script, src, exports) {
    var __evaluate = window.__evaluate;
    if( typeof exports === 'string' ) script += '\nmodule.exports = ' + exports + ';';
    return eval('/* ' + (src ? src : window.location.path) + ' */\
    script = window.script, src = window.src, \
    (function(exports, require, module, __filename, __dirname, global) { ' + script + '\n});');
  }
  
  (function() {
    "use strict";
    
    var LABEL = '[webmodules] ';
    var WEB_MODULES = 'web_modules';
    var NODE_MODULES = 'node_modules';
    var webmodules;
    
    var currentScript = document._currentScript || document.currentScript || (function() {
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
      normalize: function(src) {
        if( typeof src !== 'string' ) throw new TypeError('Path must be a string. Received ' + src);
        if( !src ) return '.';
        var a = document.createElement('a');
        a.href = src || '';
        return a.pathname;
      },
      resolve: function() {
        var src = this.join.apply(this, arguments);
        var a = document.createElement('a');
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
        if( !~pos ) return '';
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
        writeFileSync: function(src, contents) {
          src = path.normalize(src);
          if( debug ) console.log(LABEL + 'fs write', src);
          files[src] = contents;
          return this;
        },
        readFileSync: function(src) {
          if( !src ) throw new Error(LABEL + 'missing src');
          var text = files[path.normalize(src)], error;
          if( typeof text !== 'string' ) {
            var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
            xhr.open('GET', src, false);
            xhr.onreadystatechange = function(e) {
              if( this.readyState == 4 && (this.status === 0 || (this.status >= 200 && this.status < 300) ) ) text = this.responseText;
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
    
    
    var loader = (function() {
      var mapping = {};
      
      var loader = function(src, type) {
        var extension = path.extname(src).toLowerCase();
        type = type || mapping[src];
        var loader;
        
        if( webmodules ) loader = type ? webmodules.loaders.find(type) : webmodules.loaders.findByExtension(extension);
        if( debug ) console.info('load', src, type);
        
        if( loader ) {
          return loader.load(src);
        } else {
          if( !~['.js', '.json'].indexOf(extension) )
            console.warn(LABEL + 'unsupported type \'' + extension + '\'', src);
          
          if( extension === '.json' ) return { exports: JSON.parse(fs.readFileSync(src)) };
          else return { code: fs.readFileSync(src) };
        }
      };
      
      loader.mapping = function(src, loader) {
        mapping[path.normalize(src)] = loader;
      };
      
      return loader;
    })();
    
    var cwd = path.normalize('.');
    var basePackage = (function() {
      var name = config('package.name') || path.filename(document.URL) || 'index.html';
      var version = config('package.version') || '0.0.0';
      var pkgdir = path.normalize(path.join(path.dirname(currentScript.src), '..'));
      var dir = path.normalize(path.join(pkgdir, '..'));
      
      return {
        name: name,
        version: version,
        dir: dir,
        pkgdir: pkgdir,
        loader: {},
        manifest: {
          name: name,
          version: version,
          _files: [],
          _directories: []
        }
      };
    })();
    
    var debug = config('debug') === 'true' ? true : false;
    var webmodulesdir = path.dirname(path.normalize(currentScript.src));
    
    if( debug ) {
      console.info(LABEL + 'webmodules dir', webmodulesdir);
      console.info(LABEL + 'base pacakge', path.join(path.dirname(currentScript.src), '..', '..'), basePackage);
    }
    
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
    
    
    var libs = {
      define: function(name, config) {
        if( !name ) throw new Error(LABEL + 'define library: missing name');
        if( typeof config === 'string' ) config = {src:config};
        if( !(config.src || config.exports) ) throw new Error(LABEL + 'define library: config object must contains src or exports');
        if( debug ) console.log(LABEL + 'define library', name, config);
        libs[name] = config;
        return libs;
      },
      get: function(name) {
        return libs[name];
      },
      remove: function(name) {
        delete libs[name];
        return libs;
      },
      load: function(name) {
        var lib = libs[name];
        if( !lib ) throw new Error(LABEL + 'Cannot find library \'' + name + '\'');
        if( lib && lib.exports ) return {exports: lib.exports};
        if( lib && lib.module ) return lib.module;
        return lib.module = load(lib.src);
      }
    };
    
    function evaluate(script, src, exports) {
      return __evaluate(script, src, exports);
    }
    
    /*function exec(fn, filename, caller) {
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
      /
      
      var module = {parent: caller, loaded: false};
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
      module.loaded = true;
      events.fire('exec', {
        fn: fn,
        exports: exports,
        require: require,
        filename: __filename,
        dirname: __dirname
      });
      return module.exports || exports || {};
    }*/
    
    var packageCache = {}, cache = {};
    function loadPackage(src) {
      var dir = path.normalize(src);
      if( packageCache[dir] ) return packageCache[dir];
      
      var pkgjsonfile = dir + '/package.json';
      var manifest = loader(pkgjsonfile).exports;
      
      var module = cache[pkgjsonfile] = {
        id: pkgjsonfile,
        filename: pkgjsonfile,
        exports: manifest,
        loaded: true,
        children: [],
        paths: []
      };
      
      var pkg = packageCache[dir] = {
        name: manifest.name,
        version: manifest.version,
        dir: dir,
        manifest: manifest,
        main: null,
        loader: null,
        aliases: null
      };
      
      module.require = createRequire(module);
      
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
      var main, aliases;
      if( typeof manifest.browser === 'string' ) {
        main = manifest.browser;
      } else if( manifest.browser && typeof manifest.browser === 'object' ) {
        main = manifest.main;
        
        (function() {
          aliases = {};
          var bpd = manifest.browserPeerDependencies || {};
          var pd = manifest.peerDependencies || {};
          var bdep = manifest.browserDependencies || {};
          var dep = manifest.dependencies || {};
          
          for(var k in manifest.browser) {
            var v = manifest.browser[k];
            if( bpd[k] || pd[k] || bdep[k] || dep[k] || ~libs[k] || typeof v !== 'string' ) {
              if( debug ) console.info(LABEL + 'swap package', k, v, manifest);
            } else {
              if( debug ) console.info(LABEL + 'swap file', k, v, manifest);
              aliases[path.normalize(path.join(dir, k))] = path.normalize(path.join(dir, v));
            }
          }
        })();
      } else {
        main = manifest.main;
      }
      
      // TODO: main 이 없을때 web 필드를 해석하는게 옳은지에 대해서는 생각해볼 필요가 있다. (호환성 문제)
      // bower 등으로 설치한 경우 main 을 확정할 수 없을때는 require('pkg/subpath') 형태로 개발자가 직접 지정하는게 맞는것 같다.
      // 어쨋든, main 을 확정할 수 없을 경우 package.json/web 필드를 이용한다.
      // 배열일 경우, 가장 먼저 발견된 js 를 main 으로 하고, js 가 없을 경우, 첫번째 배열요소를 main 으로 선택한다.
      var web = manifest.web;
      if( !main && web ) {
        if( typeof web === 'string' ) web = [web];
        if( Array.isArray(web) ) {
          web.forEach(function(src) {
            if( endsWith(src, '.js') && !main ) main = src;
          });
          if( !main ) main = web[0];
        }
      }
      
      if( debug ) console.log(LABEL + 'package loaded', manifest.name, dir, main);
      
      // main 확정
      main = path.normalize(path.join(dir, main || 'index.js'));
      
      pkg.main = main;
      pkg.aliases = aliases;
      pkg.loader = manifest.webmodules && manifest.webmodules.loader;
      
      return pkg;
    }
    
    function getPackage(src) {
      if( debug ) console.log(LABEL + 'get package', src);
      var paths = src.split('/');
      if( ~paths.indexOf(WEB_MODULES) || ~paths.indexOf(NODE_MODULES) ) {
        var pos = paths.lastIndexOf(WEB_MODULES);
        if( paths.lastIndexOf(NODE_MODULES) > pos ) pos = paths.lastIndexOf(NODE_MODULES);
        var dir = paths.slice(0, pos + 2).join('/');
        return loadPackage(dir);
      } else if( src.indexOf(webmodulesdir) === 0 ) { // when src is webmodules package
        return loadPackage(webmodulesdir);
      }
      return basePackage;
    }
    
    function load(src, caller) {
      if( !src ) throw new TypeError(LABEL + 'missing src');
      if( typeof src !== 'string' ) throw new TypeError(LABEL + 'src must be a string');
      
      if( debug ) console.info(LABEL + 'load', src);
      
      src = path.normalize(src);
      if( cache[src] ) return cache[src];
      
      // find package
      var pkg = getPackage(src);
      
      // create module object
      var module = cache[src] = {
        id: src,
        filename: src,
        exports: {},
        parent: caller,
        loaded: false,
        children: [],
        paths: []
      };
      module.require = createRequire(module);
      
      var type;
      if( webmodules && pkg.loader ) {
        (function() {
          for( var pattern in pkg.loader ) {
            var v = pkg.loader[pattern];
            if( webmodules.match(src, pattern) ) type = v;
          }
        })();
      }
      
      if( debug ) console.info(LABEL + 'load', src, type, pkg.name);
      
      var loaded = loader(src, type);
      if( loaded.exports ) {
        module.exports = loaded.exports;
      } else if( typeof loaded.code === 'string' ) {
        evaluate(loaded.code, module.filename).call(module.exports, module.exports, module.require, module, module.filename, path.dirname(module.filename), window);
      } else {
        throw new Error(LABEL + 'load error(null exports or code): ' + src);
      }
      
      module.loaded = true;
      return module;
    }
    
    function createRequire(module) {
      var filename = module && module.filename;
      var dir = filename ? path.dirname(filename) : basePackage.dir;
      var pkg = getPackage(dir);
      
      //console.info('create require', module, filename, dir, pkg.name);
      
      if( debug ) console.log(LABEL + 'create require', dir, pkg.name);
      function getSubPackage(name) {
        var subpkgdir;
        
        // browserify: aliases is package.json/browser 필드가 object 인 경우이다.
        // https://github.com/substack/browserify-handbook#browser-field
        var aliases = pkg.aliases;
        if( aliases ) {
          var alias = aliases[name];
          if( alias === false ) 
            throw new Error(LABEL + 'sub package \'' + name + '\' is ignored (package.json/browser) : ' + pkg.dir);
          else if( alias && typeof alias === 'string' ) name = alias;
        }
        
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
        
        if( debug ) {
          console.log(LABEL + 'sub package[' + name + '] dir:', subpkgdir);
          return loadPackage(subpkgdir);
        }
        
        try {
          return loadPackage(subpkgdir);
        } catch(err) {
          if( debug ) console.error(err);
          throw new Error('Cannot find module \'' + name + '\' : ' + err.message);
        }
      }
      
      function resolveFilename(src) {
        // https://nodejs.org/api/modules.html#modules_all_together
        var pkg = getPackage(src);
        var relpath = src.substring(pkg.dir.length);
        
        var files = pkg.manifest._files;
        var dirs = pkg.manifest._directories;
        
        if( files ) {
          if( ~files.indexOf(relpath) ) {
            //console.log('src', src, 'file');
            return src;
          } else if( ~files.indexOf(relpath + '.js') ) {
            //console.log('src', src, 'file(.js)');
            return src + '.js';
          } else if( ~files.indexOf(relpath + 'package.json') ) {
            //console.log('src', src, 'directory(package.json)');
            return loadPackage(src).main;
          } else if( ~dirs.indexOf(relpath) ) {
            //console.log('src', src, 'directory');
            return src + '/index.js';
          } else {
            //throw new Error('Cannot find file \'' + src + '\'');
          }
        } else {
          console.warn(LABEL + 'not found \'_files\', \'_directories\' fields in \'package.json\'', pkg.dir, pkg);
        }
        
        return path.extname(src) ? src : src + '.js';
      }
      
      function resolve(src) {
        var filepath, srccase = 0;
        
        // resolve alias, browserify: https://github.com/substack/browserify-handbook#browser-field
        if( pkg.aliases ) {
          var alias = pkg.aliases[path.normalize(src)];
          if( alias === false ) throw new Error(LABEL + 'sub module \'' + src + '\' is ignored: ' + pkg.name);
          else if( alias && typeof alias === 'string' ) src = alias;
          
          if( debug ) console.info(LABEL + 'resolve(alias)', src, alias, pkg.aliases, pkg.manifest.browser);
        }
        
        if( !src.indexOf('.') ) {
          filepath = path.normalize(path.join(dir, src));
          srccase = 1;
        } else if( !src.indexOf('/') ) {
          filepath = path.normalize(src);
          srccase = 2;
        } else {
          var pkgname, subpath;
          
          if( ~src.indexOf('/') ) {
            pkgname = src.substring(0, src.indexOf('/'));
            subpath = src.substring(src.indexOf('/'));
            srccase = 3;
          } else {
            pkgname = src;
            srccase = 4;
          }
          
          if( libs[pkgname] ) { // when if pkg is defined library
            if( subpath && subpath !== '/' ) throw new Error('Cannot find module \'' + src + '\'');
            return pkgname;
          } else {
            var subpkg = getSubPackage(pkgname);
            if( subpath ) filepath = path.normalize(path.join(subpkg.dir, subpath));
            else filepath = subpkg.main;
          }
        }
        
        filepath = resolveFilename(filepath);
        
        if( debug ) console.log(LABEL + 'resolve(' + srccase + ')', src, resolveFilename(filepath));
        return filepath;
      }
      
      function require(src) {
        src = resolve(src);
        return libs[src] ? libs.load(src).exports : load(src, module).exports;
      }
      
      require.__directory = dir;
      require.__package = pkg;
      require.resolve = resolve;
      require.cache = cache;
      return require;
    }
    
    // pack webmodule
    var WebModules = {
      require: createRequire(),
      createRequire: createRequire,
      load: load,
      loadPackage: loadPackage,
      evaluate: evaluate,
      cache: cache,
      packages: packageCache,
      libs: libs,
      fs: fs,
      on: events.on,
      once: events.once,
      off: events.off
    };
    
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
      
      // bootstraping
      (function() {
        // put env defined via meta tag
        [].forEach.call(document.querySelectorAll('meta[name^="webmodules.env."]'), function(el) {
          var name = el.getAttribute('name');
          var content = el.getAttribute('content');
          process.env[name.substring(15)] = content;
        });
        
        // process aliases
        [].forEach.call(document.querySelectorAll('meta[name="webmodules.alias"]'), function(el) {
          var src = el.getAttribute('src');
          var as = el.getAttribute('as');
          
          if( src && as ) {
            if( !basePackage.aliases ) basePackage.aliases = {};
            basePackage.aliases[as] = src;
          }
        });
        
        // loader matches
        [].forEach.call(document.querySelectorAll('meta[name="webmodules.loader"]'), function(el) {
          var match = el.getAttribute('match');
          var loader = el.getAttribute('loader');
          
          if( match && loader ) basePackage.loader[match] = loader;
        });
        
        // bootstrap
        (function() {
          // bind bundled fs, path (bootstrap 에 의해 대체되지 않으면 기본 path, fs 사용)
          libs.define('fs', {exports:fs});
          libs.define('path', {exports:path});
        
          var bootstrapscripts = document.querySelectorAll('script[data-bootstrap]');
          if( bootstrapscripts.length ) {
            // load defined bootstrap instead default bootstrap package
            [].forEach.call(bootstrapscripts, function(el) {
              var type = el.type;
              if( !type || type.toLowerCase() === 'text/javascript' ) return;
              if( el.__webmodules_managed__ ) return;
              el.__webmodules_managed__ = true;
              
              var src = el.getAttribute('data-src');
              var script = el.textContent || el.innerText;
              
              if( !src ) {
                // write to virtual fs
                src = path.join(cwd, 'inline-' + Math.random() + '.js');
                fs.writeFileSync(src, script || '');
              }
              
              var result = WebModules.require(src);
              if( debug ) console.log(LABEL + 'bootstrap', src, result);
              for( var k in result ) libs.define(k, result[k]);
            });
          } else {
            // load default bootstrap package (webmodules/node_modules/node-libs-browser)
            var src = path.normalize(path.join(path.dirname(currentScript.src), NODE_MODULES, 'node-libs-browser'));
            var pkg = WebModules.loadPackage(src);
            var result = WebModules.require(pkg.main);
            if( debug ) console.log(LABEL + 'bootstrap', src, result);
            for( var k in result )
              if( result[k] ) libs.define(k, result[k]);
          }
          
          // bind process to global if exists 'process' pacakage in bootstrap
          if( libs['process'] ) {
            var env = process.env;
            process = WebModules.require('process');
            for(var k in env) process.env[k] = env[k];
          }
        })();
        
        // load self webmodules for use loader
        webmodules = WebModules.require(path.filename(webmodulesdir));
        webmodules.runtime(WebModules);
      })();
      
      function handleScriptTag(el) {
        var type = el.type;
        if( !type || type.toLowerCase() === 'text/javascript' ) return;
        if( el.__webmodules_managed__ ) return;
        el.__webmodules_managed__ = true;
        
        var typeloader = webmodules.loaders.findByMimeType(el.type.toLowerCase());
        var src = el.getAttribute('data-src');
        var name = el.getAttribute('data-as');
        var script = el.textContent || el.innerText;
        var exec = el.hasAttribute('data-exec');
        
        if( !src ) {
          var extname = typeloader && typeloader.extensions ? typeloader.extensions[0] : '.js';
          if( extname[0] !== '.' ) extname = '.' + extname;
          
          // write to virtual fs
          src = path.join(cwd, 'inline-' + Math.random() + extname);
          fs.writeFileSync(src, script || '');
          
          if( typeloader ) loader.mapping(src, typeloader.name);
        }
        
        src = path.normalize(src);
        
        if( name ) {
          libs.define(name, {src: src});
          if( exec ) WebModules.require(name);
        } else {
          WebModules.require(src);
        }
      }
      
      // scan
      WebModules.scan = function() {
        var doc = document.currentScript && document.currentScript.ownerDocument || document;
        
        [].forEach.call(doc.querySelectorAll('script'), function(el) {
          handleScriptTag(el);
        });
      }
      
      WebModules.scan();
      window.addEventListener('DOMContentLoaded', function(e) {
        WebModules.scan();
      });
    })();
  })();
})();


