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
                plugins: [
                  purgecss({
                    content: [
                      path.join(__dirname, '..', 'html', '*.html'),
                      path.join(__dirname, '..', 'src', 'pages', '*.ts'),
                      path.join(__dirname, '..', 'src', 'css', '*.scss'),
                    ],
                    safelist: [/^modal-/],
                  }),
                ],
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
