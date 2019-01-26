# webmodules

**THIS PROJECT IS NO LONGER MAINTAINED**

[![NPM Version][npm-version]][npm-url] [![NPM Downloads][npm-total]][npm-url] [![NPM Downloads][npm-month]][npm-url] [![NPM Downloads][license]][npm-url] [![Join the chat at https://gitter.im/attrs/webmodules][gitter]][gitter-link]

[npm-version]: https://img.shields.io/npm/v/webmodules.svg?style=flat
[npm-url]: https://npmjs.org/package/webmodules
[npm-total]: https://img.shields.io/npm/dt/webmodules.svg?style=flat
[npm-month]: https://img.shields.io/npm/dm/webmodules.svg?style=flat
[license]: https://img.shields.io/npm/l/webmodules.svg?style=flat
[gitter]: https://badges.gitter.im/attrs/webmodules.svg
[gitter-link]: https://gitter.im/attrs/webmodules?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge

## Install
```sh
$ npm i -g webmodules
```

## Usage
```sh
$ mkdir myapp
$ cd myapp
$ npm install jquery
```

- `public/index.html`

```html
<!DOCTYPE html>
<html>
<head>
  <script type="text/commonjs" data-src="app.js"></script>
  <script src="/node_modules/webmodules/runtime.js"></script>
</head>
<body>
  <div id="content"></div>
</body>
</html>
```

- `public/app.js`

```javascript
var $ = require('jquery');
var sub = require('./sub.js');

$(document).ready(function($) {
    $('#content').html('hello, ' + sub.value);
});
```

- `public/sub.js`

```javascript
exports.value = 'world';
```

- launch

```sh
$ wpm up ./public
```

## Programmatically

```sh
$ npm i webmodules express
```

- lib/index.js

```javascript
var webmodules = require('webmodules');
var express = require('express');

var app = express()
.use('/node_modules', webmodules.router())
.use('/', express.static('public'))
.listen(9000);
```

```sh
$ node lib
```

## Examples
- [commonjs](./examples/commonjs)
- [es2015](./examples/es2015)
- [coffee-script](./examples/coffee-script)
- [custom library](./examples/custom-libs)
- [bootstrap](./examples/bootstrap)
- [angular](./examples/angular)
- [react-dom](./examples/react-dom)
- [react-native-web](./examples/react-native-web)
- [various](./examples/various)


### License
Licensed under the MIT License.
See [LICENSE](./LICENSE) for the full license text.
