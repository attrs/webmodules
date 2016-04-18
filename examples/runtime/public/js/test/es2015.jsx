import React from 'react';
import ReactDOM from 'react-dom';

export default class App extends React.Component {
  render() {
    return <div>React Test With ES2015</div>;
  }
}

ReactDOM.render(
  <App />,
  document.getElementById("react-es2015")
);