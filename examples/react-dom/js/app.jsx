var React = require('react');
var ReactDOM = require('react-dom');

var Avatar = require('./avatar.jsx');
var AvatarES2015 = require('./avatar.es2015.jsx').Avatar;

window.addEventListener('DOMContentLoaded', function() {
  console.error('app');
  
  ReactDOM.render(
    React.createElement(Avatar, {
      pagename: 'Engineering'
    }),
    document.getElementById('react')
  );
  
  ReactDOM.render(
    React.createElement(AvatarES2015, {
      pagename: 'Engineering'
    }),
    document.getElementById('react-es2015')
  );
});