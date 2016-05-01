import React from 'react';

class PagePic extends React.Component {
  render() {
    return (
      <img src={"https://graph.facebook.com/" + this.props.pagename + "/picture"} />
    );
  }
}

class PageLink extends React.Component {
  render() {
    return (
      <a href={"https://www.facebook.com/" + this.props.pagename}>
        {this.props.pagename}
      </a>
    );
  }
}

class Avatar extends React.Component {
  render() {
    return (
      <div>
        <PagePic pagename={this.props.pagename} />
        <PageLink pagename={this.props.pagename} />
      </div>
    );
  }
}

export {Avatar};