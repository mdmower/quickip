/**
 * @license Apache-2.0
 */

import path from 'node:path';
import purgecss from '@fullhuman/postcss-purgecss';
import {Browser, dirRef} from './utils.js';
import {Configuration} from 'webpack';
import {EsbuildPlugin} from 'esbuild-loader';
import HtmlBundlerPlugin from 'html-bundler-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';

/**
 * Generate browser-specific webpack config
 * @param debug Whether to run in debug mode
 * @param browser Target browser
 */
export function getWebpackConfig(debug: boolean, browser: Browser): Configuration {
  const entry: Configuration['entry'] = {};
  if (browser !== 'firefox') {
    entry.sw = path.resolve(dirRef.src, 'sw.ts');
  } else if (browser === 'firefox') {
    entry.background = path.resolve(dirRef.src, 'background.ts');
  }

  const htmlEntry: HtmlBundlerPlugin.PluginOptions['entry'] = {
    bubble: path.resolve(dirRef.src, 'bubble.html'),
    options: path.resolve(dirRef.src, 'options.html'),
  };
  if (browser !== 'firefox') {
    htmlEntry.offscreen = path.resolve(dirRef.src, 'offscreen.html');
  }

  return {
    mode: debug ? 'development' : 'production',
    devtool: debug ? 'inline-source-map' : undefined,
    entry,
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'esbuild-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.s?css$/,
          use: [
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    // ESM type definitions are incorrect for default purgecss import
                    (purgecss as unknown as typeof purgecss.default)({
                      contentFunction: (sourceFile) => {
                        const name = path.basename(sourceFile).split('.')[0];
                        const sources = [
                          `src/${name}.html`,
                          `src/${name}.ts`,
                          `src/utils.ts`,
                          `src/css/${name}.scss`,
                        ];
                        if (name === 'options') {
                          sources.push(
                            'node_modules/bootstrap/js/dist/modal.js',
                            'node_modules/bootstrap/js/dist/tab.js'
                          );
                        }
                        return sources;
                      },
                      safelist: [/^modal-/],
                    }),
                  ],
                },
              },
            },
            {
              loader: 'sass-loader',
              options: {
                sassOptions: {
                  // Silence deprecations in bootstrap 5.3 SCSS
                  // https://github.com/twbs/bootstrap/issues/40962
                  quietDeps: true,
                  silenceDeprecations: ['import'],
                },
              },
            },
          ],
        },
        {
          test: /\.(png|svg)$/,
          type: 'asset/resource',
          generator: {
            filename: 'img/[name].[hash:8][ext][query]',
          },
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    output: {
      filename: '[name].js',
      chunkFilename: '[name].chunk.js',
      path: path.join(dirRef.dist, browser),
    },
    plugins: [
      new EsbuildPlugin({
        define: {
          G_QIP_BROWSER: JSON.stringify(browser),
        },
      }),
      new CopyPlugin({
        patterns: [
          {
            from: path.join(dirRef.static, 'icons'),
            to: path.join(dirRef.dist, browser, 'icons'),
          },
        ],
      }),
      new HtmlBundlerPlugin({
        entry: htmlEntry,
        minifyOptions: debug
          ? undefined
          : {
              collapseBooleanAttributes: true,
              collapseWhitespace: true,
              conservativeCollapse: true,
              decodeEntities: true,
              removeComments: true,
            },
      }),
    ],
  };
}
