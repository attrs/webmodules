(function() {
  var node_global = {
    process: {
      nextTick: function(fn) {
        setTimeout(fn, 0);
      },
      env: {
        NODE_ENV: 'development'
      }
    },
    Buffer: window.Buffer
  };
  
  function __evaluate(script, src, exports) {
    var process = node_global.process;
    var Buffer = node_global.Buffer;
    var setTimeout = node_global.setTimeout || window.setTimeout;
    var clearTimeout = node_global.clearTimeout ||window.clearTimeout;
    var setInterval = node_global.setInterval || window.setInterval;
    var clearInterval = node_global.clearInterval ||window.clearInterval;
    var setImmediate = node_global.setImmediate || window.setTimeout;
    var clearImmediate = node_global.clearImmediate ||window.clearTimeout;
    
    return (function() {
      var node_global = window.node_global;
      var __evaluate = window.__evaluate;
      
      if( typeof exports === 'string' ) script += '\nmodule.exports = ' + exports + ';';
      return eval('/* ' + (src ? src : window.location.path) + ' */\
      script = window.script, src = window.src, \
      (function(exports, require, module, __filename, __dirname, global) { ' + script + '\n});');
    })();
  }
  
  (function() {
    'use strict';
    
    var LABEL = '[webmodules] '
      ,WEB_MODULES = 'web_modules'
      ,NODE_MODULES = 'node_modules'
      ,minimatch
      ,win = window
      ,doc = document
      ,log = function() {
        console && console.log.apply(console, arguments);
      };
    
    var currentScript = doc.currentScript || (function() {
      var scripts = doc.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();
    
    function config(name, alt) {
      var root = doc.head.querySelector('meta[name="webmodules.' + name + '"][content]');
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
      resolve: function() {
        var src = this.join.apply(this, arguments);
        var a = doc.createElement('a');
        a.href = src || '';
        return a.pathname;
      },
      dirname: function(src) {
        if( src[src.length - 1] === '/' ) return src.substring(0, src.length - 1);
        else return src.substring(0, src.lastIndexOf('/')) || '/';
      },
      extname: function(src) {
        var filename = path.basename(src);
        var pos = filename.lastIndexOf('.');
        if( !~pos ) return '';
        if( ~pos ) return filename.substring(pos);
        return '';
      },
      basename: function(src) {
        while(~src.indexOf('//')) src = src.split('//').join('/');
        if( endsWith(src, '/') ) src = src.substring(0, src.length -1);
        return src.substring(src.lastIndexOf('/') + 1);
      }
    };
    
    var fs = (function() {
      var files = {};
      
      return {
        write: function(src, contents) {
          if( !src ) throw new Error('missing src');
          src = path.resolve(src);
          if( debug ) log('fs write', src);
          files[src] = contents;
          return this;
        },
        remove: function(src) {
          if( !src ) throw new Error('missing src');
          src = path.resolve(src);
          delete files[src];
          return this;
        },
        get: function(src) {
          if( !src ) throw new Error('missing src');
          return files[path.resolve(src)];
        },
        load: function(src) {
          if( !src ) throw new Error('missing src');
          src = path.resolve(src);
          if( src in files ) return files[src];
          
          var text, error;
          var xhr = win.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
          xhr.open('GET', src, false);
          xhr.onreadystatechange = function(e) {
            if( this.readyState == 4 && (this.status === 0 || (this.status >= 200 && this.status < 300) ) ) text = this.responseText;
            else error = this.responseText;
          };
          xhr.send();
          
          if( error ) throw new Error('Cannot find module \'' + src + '\': ' + error);
          text = text.split('//# sourceMappingURL=').join('//'); // TODO: validate sourcemap URL
          return text;
        }
      }
    })();
    
    var loaders = (function() {
      var loaders = {}, mimemap = {}, extensionmap = {}, mapping = {}, patterns = {}, defaultLoader;
      
      var Loader = {
        load: function(src, type) {
          var code = fs.load(src), loader, type = type || mapping[src];
          if( typeof code === 'function' ) return { fn: code };
          
          if( typeof type === 'string' ) {
            loader = Loader.get(type);
            if( !loader ) throw new Error('Cannot find loader for \'' + type + '\'');
          } else if( typeof type === 'object' && minimatch ) {
            for( var pattern in type ) {
              if( minimatch(src, pattern, { matchBase: true }) )
                loader = Loader.get(type[pattern]);
            }
          } 
          
          // find using global pattern
          if( !loader && minimatch ) {
            for( var pattern in patterns ) {
              if( minimatch(src, pattern, { matchBase: true }) )
                loader = Loader.get(patterns[pattern]);
            }
          }
          
          if( !loader ) {
            var extension = path.extname(src).toLowerCase();
            loader = Loader.findByExtension(extension) || Loader.getDefault();
          }
          
          if( debug ) log('loader', src, type, loader);
          return loader.load(code, src);
        },
        pattern: function(pattern, type) {
          patterns[pattern] = type;
          return this;
        },
        mapping: function(src, type) {
          mapping[path.resolve(src)] = type;
          return this;
        },
        define: function(name, options) {
          if( !name ) throw new Error('missing loader name');
          if( !options ) throw new Error('missing loader options');
          if( !options ) throw new Error('missing options');
          if( typeof options.load !== 'function' ) throw new Error('options.load is must be a function');
          
          var loader = {
            name: name,
            options: options,
            load: options.load
          };
          
          var extensions = [];
          var mimeTypes = [];
          (options.extensions || []).forEach(function(extension) {
            if( extension[0] !== '.' ) extension = '.' + extension;
            extensionmap[extension] = loader;
            extensions.push(extension);
          });
        
          (options.mimeTypes || []).forEach(function(mime) {
            mimemap[mime] = loader;
            mimeTypes.push(mime);
          });
        
          loader.mimeTypes = mimeTypes;
          loader.extensions = extensions;
          loaders[name] = loader;
        
          if( options.isDefault ) defaultLoader = loader;
        
          return this;
        },
        names: function() { 
          return Object.keys(loaders);
        },
        get: function(name) {
          return loaders[name];
        },
        getDefault: function() {
          return defaultLoader;
        },
        setDefault: function(name) {
          defaultLoader = loaders(name) || defaultLoader;
          return this;
        },
        findByExtension: function(extension) {
          return extensionmap[extension] && extensionmap[extension];
        },
        findByMimeType: function(mime) {
          return mimemap[mime] && mimemap[mime];
        },
        mimeTypes: function() {
          return Object.keys(mimemap);
        },
        extensions: function() {
          return Object.keys(extensionmap);
        }
      };
      
      // define default loaders (commonjs/json)
      Loader.define('commonjs', {
        extensions: ['.js'],
        isDefault: true,
        load: function(source) {
          return {
            code: source
          };
        }
      });
      
      Loader.define('json', {
        extensions: ['.json'],
        mimeTypes: ['text/json', 'application/json'],
        load: function(source) {
          return {
            exports: JSON.parse(source)
          };
        }
      });
      
      return Loader;
    })();
    
    var cwd = path.resolve('.');
    var mainpkg = (function() {
      var name = config('package.name') || path.basename(location.pathname) || 'webmodules-runtime';
      var version = config('package.version') || '0.0.0';
      var pkgdir = path.resolve(path.join(path.dirname(currentScript.src), '..'));
      var dir = path.resolve(path.join(pkgdir, '..'));
      
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
    var webmodulesdir = path.dirname(path.resolve(currentScript.src));
    var modulebase = path.resolve(webmodulesdir, '..');
    
    if( debug ) {
      log('module base', modulebase);
      log('webmodules dir', webmodulesdir);
      log('base pacakge', path.join(path.dirname(currentScript.src), '..', '..'), mainpkg);
    }
    
    /*var events = (function() {
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
    })();*/
    
    var libs = {
      define: function(name, config) {
        if( !name ) throw new Error('define library: missing name');
        if( typeof config === 'string' ) config = {src:config};
        if( !(config.src || config.exports) ) throw new Error('define library: config object must contains src or exports');
        if( debug ) log('define library', name, config);
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
        if( !lib ) throw new Error('Cannot find library \'' + name + '\'');
        if( lib && lib.exports ) return {exports: lib.exports};
        if( lib && lib.module ) return lib.module;
        return lib.module = {exports: WebModules.require(lib.src)};
      }
    };
    
    function evaluate(script, src, exports) {
      return __evaluate(script, src, exports);
    }
    
    var packageCache = {}, cache = {}, dirmap = [];
    function existsDirectory(dir) {
      var dir = path.resolve(dir);
      return ~dirmap.indexOf(dir) ? true : false;
    }
    
    function loadPackage(src) {
      var dir = path.resolve(src);
      if( packageCache[dir] ) return packageCache[dir];
      
      var pkgjsonfile = dir + '/package.json';
      var manifest = loaders.load(pkgjsonfile).exports;
      
      if( !manifest._files || !manifest._directories ) 
        console.warn('not found \'_files\', \'_directories\' fields in \'package.json\'', pkgjsonfile, manifest);
      
      var dirs = [], files = [];
      manifest._directories && manifest._directories.forEach(function(p) {
        dirs.push(p.split('\\').join('/'));
      });
      
      manifest._files && manifest._files.forEach(function(p) {
        files.push(p.split('\\').join('/'));
      });
      
      manifest._directories = dirs;
      manifest._files = files;
      
      manifest._directories && manifest._directories.forEach(function(subpath) {
        subpath = path.resolve(dir, subpath);
        if( !~dirmap.indexOf(subpath) ) dirmap.push(subpath);
      });
      
      var pkg = packageCache[dir] = {
        name: path.basename(dir),
        version: manifest.version,
        dir: dir,
        manifest: manifest,
        main: null,
        loader: null,
        aliases: null
      };
      
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
              if( debug ) log('swap package', k, v, manifest);
            } else {
              if( debug ) log('swap file', k, v, manifest);
              aliases[path.resolve(path.join(dir, k))] = path.resolve(path.join(dir, v));
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
      
      if( debug ) log('package loaded', pkg.name, manifest.name, dir, main);
      
      // main 확정
      main = path.resolve(path.join(dir, main || 'index.js'));
      
      pkg.main = main;
      pkg.aliases = aliases;
      pkg.loader = manifest.webmodules && manifest.webmodules.loader;
      
      return pkg;
    }
    
    function getPackage(src) {
      if( debug ) log('get package', src);
      
      // TODO: 좀 더 정확하게 개선필요
      var paths = src.split('/');
      if( ~paths.indexOf(WEB_MODULES) || ~paths.indexOf(NODE_MODULES) ) {
        var pos = paths.lastIndexOf(WEB_MODULES);
        if( paths.lastIndexOf(NODE_MODULES) > pos ) pos = paths.lastIndexOf(NODE_MODULES);
        
        var dir;
        if( paths[pos + 1][0] === '@' ) dir = paths.slice(0, pos + 3).join('/');
        else dir = paths.slice(0, pos + 2).join('/');
        
        return loadPackage(dir);
      } else if( !src.indexOf(webmodulesdir) ) { // when src is webmodules package
        return loadPackage(webmodulesdir);
      } else if( !src.indexOf(modulebase) && paths.length >= 3 ) {
        var dir;
        if( paths[2] && paths[2][0] === '@' && paths.length >= 4 ) dir = paths.slice(0, 4).join('/');
        else dir = paths.slice(0, 3).join('/');
        
        return loadPackage(dir);
      }
      
      return mainpkg;
    }
    
    
    function load(src, caller) {
      if( !src ) throw new TypeError('missing src');
      if( typeof src !== 'string' ) throw new TypeError('src must be a string');
      
      if( debug ) log('load', src);
      
      src = path.resolve(src);
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
      
      module.main = caller && caller.main || module;
      module.require = createRequire(module);
      
      var dir = path.dirname(src);
      while(dir) {
        module.paths.push(path.resolve(dir, WEB_MODULES));
        module.paths.push(path.resolve(dir, NODE_MODULES));
        if( dir === '/' ) break;
        dir = path.resolve(dir, '..');
      }
      
      if( debug ) log('load', src, pkg.name, module);
      
      var loaded = loaders.load(src, pkg.loader), fn;
      if( 'exports' in loaded ) {
        module.exports = loaded.exports;
      } else if( 'fn' in loaded ) {
        fn = loaded.fn;
      } else if( 'code' in loaded ) {
        fn = evaluate(loaded.code, module.filename);
      } else {
        throw new Error('load error(null exports or code): ' + src);
      }
      
      if( fn )
        fn.call(module.exports, module.exports, module.require, module, module.filename, path.dirname(module.filename), window);
      
      module.loaded = true;
      if( module.parent && !~module.parent.children.indexOf(module) ) module.parent.children.push(module);
      
      return module;
    }
    
    var forced = [];
    
    function createRequire(module) {
      var filename = module && module.filename;
      var dir = filename ? path.dirname(filename) : mainpkg.dir;
      var pkg = getPackage(dir);
      
      if( debug ) log('create require', filename, dir, pkg);
      
      function getDependencyPackage(name) {
        var confirmed;
        
        if( !~forced.indexOf(name) && module && module.paths ) {
          (function() {
            for(var i=0;i < module.paths.length; i++) {
              if( confirmed ) break;
              try {
                var dir = path.resolve(module.paths[i], name);
                if( existsDirectory(dir) ) confirmed = dir;
                //log('found', dir, confirmed);
              } catch(e) {}
            }
          })();
        }
        
        // 못찾았다면 modulebase 를 기준.
        confirmed = confirmed || path.resolve(modulebase, name);
        
        if( debug ) log('sub package[' + name + '] dir:', confirmed);
        return loadPackage(confirmed);
      }
      
      function resolveFilename(src) {
        // https://nodejs.org/api/modules.html#modules_all_together
        var pkg = getPackage(src);
        var relpath = src.substring(pkg.dir.length);
        
        var files = pkg.manifest._files;
        var dirs = pkg.manifest._directories;
        
        if( files && ~files.indexOf(relpath) ) return src;
        else if( files && ~files.indexOf(relpath + '.js') ) return src + '.js';
        else if( files && ~files.indexOf(relpath + 'package.json') ) return loadPackage(src).main;
        else if( dirs && ~dirs.indexOf(relpath) ) return src + '/index.js';
        
        // if cannot confirm is exists
        if( endsWith(src, '/') ) return src + 'index.js';
        return path.extname(src) ? src : src + '.js';
      }
      
      function resolve(src) {
        var filepath, srccase = 0;
        
        // resolve alias, browserify: https://github.com/substack/browserify-handbook#browser-field
        if( pkg.aliases ) {
          var alias = pkg.aliases[path.resolve(src)];
          if( alias === false ) throw new Error('sub module \'' + src + '\' is ignored: ' + pkg.name);
          else if( alias && typeof alias === 'string' ) src = alias;
          
          if( debug ) log('resolve(alias)', src, alias, pkg.aliases, pkg.manifest.browser);
        }
        
        if( !src.indexOf('.') ) {
          filepath = path.resolve(path.join(dir, src));
        } else if( !src.indexOf('/') ) {
          filepath = path.resolve(src);
        } else {
          var pkgname, subpath;
          
          if( src[0] === '@' ) {
            var spos = src.indexOf('/', src.indexOf('/') + 1);
            pkgname = ~spos ? src.substring(0, spos) : src;
            subpath = src.substring(pkgname.length);
          } else if( ~src.indexOf('/') ) {
            pkgname = src.substring(0, src.indexOf('/'));
            subpath = src.substring(pkgname.length);
          } else {
            pkgname = src;
          }
          
          // browserify: aliases is package.json/browser 필드가 object 인 경우이다.
          // https://github.com/substack/browserify-handbook#browser-field
          if( pkg.aliases ) {
            var alias = pkg.aliases[pkgname];
            if( alias === false ) 
              throw new Error('sub package \'' + name + '\' is ignored (package.json/browser) : ' + pkg.dir);
            else if( alias && typeof alias === 'string' ) pkgname = alias;
          }
          
          if( libs[pkgname] ) { // when if pkg is defined library
            if( subpath && subpath !== '/' ) {
              var libdir = path.dirname(libs[pkgname].src);
              filepath = path.resolve(libdir, subpath);
            } else {
              return pkgname;
            }
          } else {
            var subpkg = getDependencyPackage(pkgname);
            if( subpath ) filepath = path.resolve(path.join(subpkg.dir, subpath));
            else filepath = subpkg.main;
          }
        }
        
        filepath = resolveFilename(filepath);
        
        if( debug ) log('resolve', src, filepath);
        return filepath;
      }
      
      function require(src) {
        src = resolve(src);
        return libs[src] ? libs.load(src).exports : load(src, module).exports;
      }
      
      require.__directory = dir;
      require.__package = pkg;
      require.__module = module;
      require.resolve = resolve;
      require.cache = cache;
      require.__lookup = function(src) {
        src = resolve(src);
        return libs[src] ? libs.load(src) : load(src, module);
      };
      
      return require;
    }
    
    // pack webmodule
    var WebModules = {
      require: createRequire(),
      createRequire: createRequire,
      load: load,
      loadPackage: loadPackage,
      getPackage: getPackage,
      evaluate: evaluate,
      cache: cache,
      packages: packageCache,
      libs: libs,
      forced: forced,
      loaders: loaders,
      fs: fs
    };
    
    // exports to global & scanning
    (function() {
      if( currentScript.hasAttribute('data-export') ) {
        (function() {
          var require = typeof win.require === 'function' ? win.require : null;
          
          win.WebModules = WebModules;
          win.require = function(src) {
            if( arguments.length === 1 && typeof src === 'string' ) return WebModules.require(src);
            return require ? require.apply(window, arguments) : null;
          };
          
          win.require.__directory = WebModules.require.__directory;
          win.require.__package = WebModules.require.__package;
          win.require.resolve = WebModules.require.resolve;
          win.require.cache = WebModules.require.cache;
        })();
       }
      
      // bootstraping
      (function() {
        // put env defined via meta tag
        [].forEach.call(doc.querySelectorAll('meta[name^="webmodules.env."]'), function(el) {
          var name = el.getAttribute('name');
          var content = el.getAttribute('content');
          node_global.process.env[name.substring(15)] = content;
        });
        
        // process aliases
        [].forEach.call(doc.querySelectorAll('meta[name="webmodules.alias"]'), function(el) {
          var src = el.getAttribute('src');
          var as = el.getAttribute('as');
          
          if( src && as ) {
            if( !mainpkg.aliases ) mainpkg.aliases = {};
            mainpkg.aliases[as] = src;
          }
        });
        
        // loader (global) pattern matches
        [].forEach.call(doc.querySelectorAll('meta[name="webmodules.loader.global"]'), function(el) {
          var match = el.getAttribute('match');
          var loader = el.getAttribute('loader');
          
          if( match && loader ) loaders.pattern(match, loader);
        });
        
        // loader(base pacakge) pattern matches
        [].forEach.call(doc.querySelectorAll('meta[name="webmodules.loader"]'), function(el) {
          var match = el.getAttribute('match');
          var loader = el.getAttribute('loader');
          
          if( match && loader ) mainpkg.loader[match] = loader;
        });
        
        // forced-priority packages
        [].forEach.call(doc.querySelectorAll('meta[name="webmodules.forced"]'), function(el) {
          var pkgs = (el.getAttribute('packages') || el.getAttribute('package')).split(',');
          
          pkgs.forEach(function(pkg) {
            if( !pkg || !pkg.trim() ) return;
            WebModules.forced.push(pkg.trim());
          });
        });
        
        // bootstrap
        (function() {
          // bind bundled fs, path (bootstrap 에 의해 대체되지 않으면 기본 path, fs 사용)
          libs.define('webmodules-runtime', {exports:WebModules});
          libs.define('path', {exports:path});
          libs.define('fs', {exports:{}});
          
          var bootstrapscripts = doc.querySelectorAll('script[data-bootstrap]');
          if( bootstrapscripts.length ) {
            // load defined bootstrap instead default bootstrap package
            [].forEach.call(bootstrapscripts, function(el) {
              var type = el.type;
              if( !type || type.toLowerCase() === 'text/javascript' ) return;
              if( el.__webmodules_managed__ ) return;
              el.__webmodules_managed__ = true;
              
              var src = el.getAttribute('data-src');
              var qry = el.getAttribute('data-require');
              var script = el.textContent || el.innerText;
              
              if( qry ) src = WebModules.require.resolve(qry);
              
              if( !src ) {
                if( !script ) return;
                // write to virtual fs
                src = path.join(cwd, 'inline-' + Math.random() + '.js');
                fs.write(src, script);
              }
              
              var result = WebModules.require(src);
              if( debug ) log('bootstrap', src, result);
              for( var k in result ) libs.define(k, result[k]);
            });
          } else {
            var result = WebModules.require('webmodules').require('node-libs-browser');
            if( debug ) log('bootstrap', src, result);
            for( var k in result )
              if( result[k] ) libs.define(k, result[k]);
          }
          
          // bind process to global if exists 'process' pacakage in bootstrap
          if( libs['process'] ) {
            var env = node_global.process.env;
            node_global.process = WebModules.require('process') || node_global.process;
            for(var k in env) node_global.process.env[k] = env[k];
          }
          
          if( libs['buffer'] ) node_global.Buffer = WebModules.require('buffer').Buffer;
          
          /*if( libs['timers'] ) {
            var timers = WebModules.require('timers');
            node_global.setTimeout = timers.setTimeout;
            node_global.clearTimeout = timers.clearTimeout;
            node_global.setInterval = timers.setInterval;
            node_global.clearInterval = timers.clearInterval;
            node_global.setImmediate = timers.setImmediate;
            node_global.clearImmediate = timers.clearImmediate;
          }*/
        })();
        
        // load self webmodules & load minimatch
        var wmpkgname = path.basename(webmodulesdir);
        WebModules.require(wmpkgname).runtime(WebModules);
        minimatch = WebModules.require.__lookup(wmpkgname).require('minimatch');
      })();
      
      function handleScriptTag(el) {
        var type = el.type.toLowerCase();
        if( !type || type.toLowerCase() === 'text/javascript' ) return;
        if( el.__webmodules_managed__ ) return;
        el.__webmodules_managed__ = true;
        
        var typeloader = loaders.findByMimeType(type);
        if( !typeloader && type !== 'text/commonjs' ) return;
        
        var src = el.getAttribute('data-src');
        var qry = el.getAttribute('data-require');
        var filename = el.getAttribute('data-filename');
        var name = el.getAttribute('data-as');
        var script = el.textContent || el.innerText;
        var exec = el.hasAttribute('data-exec');
        
        if( qry ) src = WebModules.require.resolve(qry);
        
        if( !src ) {
          if( !script ) return;
          var extname = typeloader && typeloader.extensions ? typeloader.extensions[0] : '.js';
          if( extname[0] !== '.' ) extname = '.' + extname;
          
          // write to virtual fs
          src = path.join(cwd, filename || ('inline-' + Math.random() + extname));
          fs.write(src, script);
        }
        
        src = path.resolve(src);
        if( typeloader ) loaders.mapping(src, typeloader.name);
        
        if( name ) {
          libs.define(name, {src: src});
          if( exec ) WebModules.require(name);
        } else {
          WebModules.require(src);
        }
      }
      
      // scan
      WebModules.scan = function() {
        var cd = doc.currentScript && doc.currentScript.ownerDocument || doc;
        
        [].forEach.call(cd.querySelectorAll('script'), function(el) {
          handleScriptTag(el);
        });
      }
      
      WebModules.scan();
      win.addEventListener('DOMContentLoaded', function(e) {
        WebModules.scan();
      });
    })();
  })();
})();


