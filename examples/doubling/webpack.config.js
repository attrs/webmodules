module.exports = {
  entry: {
    'app': [
      './public/js/app.js'
    ]
  },
  output: {
    path: 'dist/',
    filename: '[name].js'
  },
  externals: {
    "jquery": "jQuery"
  }
};
