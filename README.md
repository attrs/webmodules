# webmodules

Module Management for Web Development.

[![NPM Version][npm-version]][npm-url] [![NPM Downloads][npm-total]][npm-url] [![NPM Downloads][npm-month]][npm-url] [![NPM Downloads][license]][npm-url] [![Join the chat at https://gitter.im/attrs/webmodules][gitter]][gitter-link]

[npm-version]: https://img.shields.io/npm/v/webmodules.svg?style=flat
[npm-url]: https://npmjs.org/package/webmodules
[npm-total]: https://img.shields.io/npm/dt/webmodules.svg?style=flat
[npm-month]: https://img.shields.io/npm/dm/webmodules.svg?style=flat
[license]: https://img.shields.io/npm/l/webmodules.svg?style=flat
[gitter]: https://badges.gitter.im/attrs/webmodules.svg
[gitter-link]: https://gitter.im/attrs/webmodules?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge


Offers the following features:
- Installing web modules to `web_modules` folder to separate them from `node_modules`.
- Provides commonjs browser runtime that can be used in a webpage.
- Assist in installing external dependencies when using webpack and browserify.


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

### Run Your Modules
> You can use browser runtime in a web page when you'd like to develop without a build process.
> es2015(*.es6), jsx(*.jsx), coffee(*.coffee), less(*.less), css(*.css), html(*.html) are supported.

- Prepare for example

```sh
$ npm install -g webmodules
$ mkdir myapp
$ cd myapp
$ wpm install jquery
```

- `index.html`

```html
<!DOCTYPE html>
<html>
<head>
  <script type="text/commonjs" data-src="app.js"></script>
  <script src="/web_modules/webmodules/runtime.js"></script>
</head>
<body>
  <div id="content"></div>
</body>
</html>
```

- `app.js`

```javascript
var $ = require('jquery');
var sub = require('./sub.js');

$(document).ready(function($) {
    $('#content').html('hello, ' + sub.value);
});
```

- `sub.js`

```javascript
exports.value = 'world';
```

- launch

```sh
$ wpm up . --open
```

## Examples
- [CommonJS](./examples/commonjs)
- [ES2015](./examples/es2015)
- [Cofee Script](./examples/coffee-script)
- [JQuery](./examples/jquery)
- [Angularjs](./examples/angular)
- [React](./examples/react)
- [Run with Node.js](./examples/with-nodejs)
- [Custom Transpiler](./examples/cutom-transpiler)


### License
Licensed under the MIT License.
See [LICENSE](./LICENSE) for the full license text.
