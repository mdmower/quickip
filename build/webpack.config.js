const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    bubble: path.resolve(__dirname, '..', 'src', 'pages', 'bubble.ts'),
    options: path.resolve(__dirname, '..', 'src', 'pages', 'options.ts'),
    sw: path.resolve(__dirname, '..', 'src', 'sw.ts'),
    'copy-ip-popup': path.resolve(__dirname, '..', 'src', 'pages', 'copy-ip-popup.ts'),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '..', 'dist'),
  },
};
