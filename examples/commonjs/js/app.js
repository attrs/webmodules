var sub = require('./sub/');

window.onload = function() {
  document.querySelector('#content').innerHTML = 'Hello,' + sub;
}