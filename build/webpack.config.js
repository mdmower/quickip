const path = require('path');
const purgecss = require('@fullhuman/postcss-purgecss');

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
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  purgecss({
                    content: ['html/*.html', 'src/pages/*.ts', 'src/css/*.scss'],
                    safelist: [/^modal-/],
                  }),
                ],
              },
            },
          },
          'sass-loader',
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '..', 'dist'),
  },
};
