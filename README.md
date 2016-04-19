# webmodules

[![NPM Version][npm-version]][npm-url] [![NPM Downloads][npm-total]][npm-url] [![NPM Downloads][npm-month]][npm-url] [![NPM Downloads][license]][npm-url]

[npm-version]: https://img.shields.io/npm/v/webmodules.svg?style=flat
[npm-url]: https://npmjs.org/package/webmodules
[npm-total]: https://img.shields.io/npm/dt/webmodules.svg?style=flat
[npm-month]: https://img.shields.io/npm/dm/webmodules.svg?style=flat
[license]: https://img.shields.io/npm/l/webmodules.svg?style=flat

Module Management for Web Development.

Offers the following features:
- Installing web modules to `web_modules` folder to separate them from `node_modules`.
- Provides commonjs browser runtime that can be used in a webpage.
- Assist in installing external dependencies when using webpack and browserify.

Goals:
- Provides straightforward way to install web modules.
- Separated installation of frontend modules and backend modules.
- Provide optimized module system for realtime frontend development.
- Optimized module building use only HTML page. (without a build scripts)
- Provide appropriate packaging system for webcomponents.

## Installation
```sh
$ npm install -g webmodules
```

## Usage
### Install Modules
```sh
$ wpm install                             # install browserDependencies(package.json)
$ wpm install packagename                 # from npm
$ wpm install packagename@version
$ wpm install packagename --save          # save to package.json
$ wpm install githubuser/project          # from github
$ wpm install bitbucket:user/project      # from bitbucket
$ wpm install bower:packagename           # from bower
$ wpm install bower:packagename@version
$ wpm install installname[packagename]    # change module installation name
$ wpm install installname[bower:packagename]
...
```

- Packages are located in `web_modules` folder when installed .
- Also you can choose your own installation folder via `.webmodulesrc` file.  (but it's not applied to sub-modules)
```json
{
    "directory": "path"
}
```

### Use Browser Runtime in a Web Page
> You can use browser runtime in a web page when you'd like to develop without a build process.
> es2015(*.es6), jsx(*.jsx), less(*.less), css(*.css), html(*.html) are supported.

- See [Example](./examples/runtime/)
- See [Example - ThreeCats](https://github.com/joje6/three-cats)

- Prepare for example
```sh
$ npm install -g webmodules
$ npm install webmodules --save
$ wpm install jquery d3 angular react react-dom --save
```

- nodejs backend
```javascript
var http = require('http');
var express = require('express');
var webmodules = require('webmodules');

express()
  .use('/test', express.static('public'))
  .use('/web_modules', webmodules.router())
  .listen(9000, function () {
    console.log('httpd listening on port 9000');
  });
```

- public/index.html
```html
<!DOCTYPE html>
<html>
<head>
  <script type="text/commonjs" data-src="js/app.js"></script>
  <script src="/web_modules/webmodules/runtime.js"></script>
</head>
<body>
  <div id="content"></div>
</body>
</html>
```

- public/js/app.js
```javascript
var path = require('path');
var $ = require('jquery');
var angular = require('angular');
var d3 = require('d3');
var react = require('react');
var reactdom = require('react-dom');

$(document).ready(function($) {
  console.log('module', require.module);
  console.log('jquery', $);
  console.log('angular', angular);
  console.log('d3', d3);
  console.log('react', react);
  console.log('reactdom', reactdom);
  console.log('sub', sub);
  console.log('path', path.join(__dirname, 'test'));
  
  var CommentBox = react.createClass({displayName: 'CommentBox',
    render: function() {
      return (
        react.createElement('div', {className: "commentBox"},
          "Hello, world! I am a CommentBox."
        )
      );
    }
  });
  
  reactdom.render(
    react.createElement(CommentBox, null),
    document.getElementById('content')
  );
});
```


### Build modules with [webpack](http://webpack.github.io/docs/)
#### Install webpack
```sh
$ npm install -g webpack
```

#### Configuration
create `webpack.config.js`
```javascript
module.exports = {
  "entry": {
    "app": [
      "./public/js/app.js"
    ]
  },
  "output": {
    "path": "dist/",
    "filename": "[name].js"
  },
  "externals": {
    "jquery": "jQuery"
  }
};
```

#### Build
```sh
$ webpack
```

### Publish Package as Web Module
Please follow the notation method of package.json of [Browserify](https://github.com/substack/browserify-handbook#browser-field).

#### package.json
```json
{
  "name": "your_package_name",
  "version": "0.0.0",
  "main": "nodejs_main_js",
  "browser": "public/js/app.js",
  "browserDependencies": {
    "lodash": "^4.11.1"
  },
  "browserPeerDependencies": {
    "jquery": "^2.2.3",
    "d3": "bower:*"
  }
  ...
}
```

#### publish
```sh
$ npm publish
```

#### Contributing



### License
Licensed under the MIT License.
See [LICENSE](./LICENSE) for the full license text.
