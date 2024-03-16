const path = require('path');
const webpack = require('webpack');

/** @type {import('webpack').Configuration} */
module.exports = {
  entry: {
    background: path.resolve(__dirname, '..', 'src', 'pages', 'background.ts'),
  },
  plugins: [
    new webpack.DefinePlugin({
      G_QIP_BROWSER: JSON.stringify('firefox'),
    }),
  ],
};
