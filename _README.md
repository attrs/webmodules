# webmodules
Provides Installing & Packaging Modules for Frontend Development.

Offers the following features:
- Installing frontend modules (currently supports npm & bower)
- Provides commonjs runtime that can be used in a webpage.

## Installation
```sh
$ npm install -g webmodules
```

If you need only Commonjs Runtime can use the `[bower](http://bower.io/)`.
```sh
$ bower install webmodules --save
```

## Usage
### Installing Web Modules
```sh
$ wm install bower:packagename --save
$ wm install npm:packagename --save
```

- Installed packages will be located in `web_modules` folder.
- Also you can choose the installation folder via `webmodulesrc` file.
```json
{
    "directory": "path"
}
```

### Use Commonjs Runtime in a Web Page
> Commonjs runtime is an additional component. You can use when you want to develop without a build process.
> and only supports modules written in commonjs or umd. (es6/jsx/css & etc is not supported)

- Installing modules for example (jquery & jquery plugin)
```sh
$ wm install jquery --save
$ wm install select2 --save
```

- nodejs backend 
```javascript
var express = require('express');
var app = express();
app.use('/web_modules', express.static('web_modules'));
app.use('/', express.static('public'));
...
```

- public/index.html
```html
<!DOCTYPE html>
<html>
<head>
  <script type="text/commonjs" data-src="app.js"></script>
  <script src="/web_modules/commonjs.runtime/commonjs.js" data-module-dir="/web_modules"></script>
</head>
....
```

- public/app.js
```javascript
var path = require('path');
var $ = require('jquery');
var select2 = require('select2');
$(document).ready(function($) {
  // ...
});
```


### Build modules via `[webpack](http://webpack.github.io/docs/)`
create `webpack.config.json`. [Detail Usage](http://webpack.github.io/docs/) 
```json

```
```sh
$ webpack
```

### Goals
- Separated Installation of frontend modules and backend modules.
- Optimized module system for Frontend development.
- Provide appropriate packaging system for webcomponents.


### License
Licensed under the MIT License.
See [LICENSE](./LICENSE.md) for the full license text.