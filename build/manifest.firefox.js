/**
 * @license Apache-2.0
 */

module.exports = {
  background: {
    scripts: ['background.js'],
  },
  browser_specific_settings: {
    gecko: {
      id: '{56f45803-b8a1-493c-b6e2-d915306e33eb}',
      strict_min_version: '115.0',
    },
  },
  options_ui: {
    page: 'options.html',
    open_in_tab: true,
  },
};
