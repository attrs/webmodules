var React = require('react');
var ReactDOM = require('react-dom');

var Avatar = React.createClass({
  render: function() {
    return (
      <div>
        <PagePic pagename={this.props.pagename} />
        <PageLink pagename={this.props.pagename} />
      </div>
    );
  }
});

var PagePic = React.createClass({
  render: function() {
    return (
      <img src={"https://graph.facebook.com/" + this.props.pagename + "/picture"} />
    );
  }
});

var PageLink = React.createClass({
  render: function() {
    return (
      <a href={"https://www.facebook.com/" + this.props.pagename}>
        {this.props.pagename}
      </a>
    );
  }
});

ReactDOM.render(
  <Avatar pagename="Engineering" />,
  document.getElementById("react")
);