var path = require('path');
var $ = require('jquery');
var angular = require('angular');
var d3 = require('d3');
var react = require('react');
var reactdom = require('react-dom');
var sub = require('./sub/sub.js');

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