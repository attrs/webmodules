# webmodules
Module Management for Web Development.

Offers the following features:
- Installing web modules to separated folder `web_components`.
- Provides commonjs browser runtime that can be used in a webpage.
- Assist install external dependencies when using webpack and browserify.

Goals:
- Provides simply way to install web modules.
- Separated installation of frontend modules and backend modules.
- Provide optimized module system for realtime frontend development.
- Optimized module building use only HTML page. (without a build scripts)
- Provide appropriate packaging system for the webcomponents.

## Installation
```sh
$ npm install -g webmodules
```

If you need only browser runtime can use the [bower](http://bower.io/).
```sh
$ bower install webmodules --save
```

## Usage
### Install Modules
```sh
$ wm install packagename --save        # from npm
$ wm install bower:packagename --save  # from bower
```

- Installed packages will be located in `web_modules` folder.
- Also you can choose the installation folder via `.webmodulesrc` file.  (but in the case of sub-modules, it does not apply)
```json
{
    "directory": "path"
}
```

### Use Browser Runtime in a Web Page
> You can use browser runtime in a web page when you want to develop without a build process.
> But only supported modules written in commonjs, umd or json. (Transpiler (es6/ts/jsx/coffee & etc) is not yet supported)

#### Using Node.js
- Prepare for this example
```sh
$ npm install -g webmodules
$ npm install webmodules --save
$ wm install jquery bower:select2 --save
```

- nodejs backend
```javascript
var express = require('express');
var webmodules = require('webmodules');
var app = express();
app.use('/', express.static('public'));
app.use('/web_modules', webmodules.router());
...
```

- public/index.html
```html
<!DOCTYPE html>
<html>
<head>
  <script type="text/commonjs" data-src="js/app.js"></script>
  <script src="/web_modules/webmodules/runtime.js"></script>
</head>
....
```

- public/js/app.js
```javascript
var path = require('path');  // from node_libs_browser
var $ = require('jquery');
var select2 = require('select2');
$(document).ready(function($) {
  // ...
});
```

#### Using Bower
```sh
$ npm install -g bower
$ bower install webmodules jquery select2 --save
```

- index.html
```html
<!DOCTYPE html>
<html>
<head>
  <script type="text/commonjs" data-src="app.js"></script>
  <script src="/bower_components/webmodules/runtime.min.js"></script>
</head>
....
```

- app.js
```javascript
var path = require('path');  // from node_libs_browser
var $ = require('jquery');
var select2 = require('select2');
$(document).ready(function($) {
  // ...
});
```


### Build modules with [webpack](http://webpack.github.io/docs/)
create `webpack.config.js`.
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

```sh
$ webpack
```

### Publish Package as Web Module
#### package.json
```json
{
  "name": "your_package_name",
  "version": "0.0.0",
  "main": "nodejs_main_js",
  "web": "public/js/app.js",
  "webDependencies": {
    "jquery": "^2.2.3",
    "select2": "bower:^4.0.1"
  }
  ...
}
```

#### bower.json
```json
{
  "name": "your_package_name",
  "version": "0.0.0",
  "main": "dist/app.js",
  "dependencies": {
    "jquery": "^2.2.3",
    "select2": "bower:^4.0.1"
  }
  ...
}
```

#### using init command
```sh
$ wm init
main: public/js/app.js
dependency: jquery
dependency: select2
build: yes
```

#### publish
```sh
$ npm publish
$ bower regist your_package_name
```





### License
Licensed under the MIT License.
See [LICENSE](./LICENSE.md) for the full license text.