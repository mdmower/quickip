const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    bubble: path.resolve(__dirname, '..', 'src', 'bubble.ts'),
    options: path.resolve(__dirname, '..', 'src', 'options.ts'),
    sw: path.resolve(__dirname, '..', 'src', 'sw.ts'),
    'copy-ip-popup': path.resolve(__dirname, '..', 'src', 'copy-ip-popup.ts'),
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
