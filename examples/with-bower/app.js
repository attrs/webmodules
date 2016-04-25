var path = require('path');

console.log('dirname', __dirname);
console.log('filename', __filename);
console.log('path', path.join(__dirname, 'test'));
console.log('hello', require('./hello.es6'));