const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    bubble: path.resolve(__dirname, '..', 'src', 'pages', 'bubble.ts'),
    options: path.resolve(__dirname, '..', 'src', 'pages', 'options.ts'),
    sw: path.resolve(__dirname, '..', 'src', 'sw.ts'),
    offscreen: path.resolve(__dirname, '..', 'src', 'pages', 'offscreen.ts'),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(scss)$/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: function () {
                  return [require('autoprefixer')];
                },
              },
            },
          },
          {
            loader: 'sass-loader',
          },
        ],
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
