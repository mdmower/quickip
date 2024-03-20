# QuickIP

A browser extension to quickly find your IPv4 and IPv6 addresses. Available at:

- [Chrome Web Store](https://chrome.google.com/webstore/detail/quickip/fminocopafmpcihgnilcacgjpcppacfn) for Google Chrome
- [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/quickip/dlkccijfhgebpigilcjllgbaiedopifj) for Microsoft Edge
- [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/quickip/) for Firefox

## Features

- Click the extension button to display your external IPv4 and/or IPv6 address
- Copy your IP to the clipboard with a keyboard shortcut (configurable)

**Supported options:**

- Select which IP version(s) should be reported
- Select which resolvers should be used for each IP version

## Development

Clone git repository locally and then install npm packages

```
npm install
```

Available npm scripts:

- `npm run lint` - Lint source using eslint
- `npm run format` - Format source using prettier
- `npm run build [chrome|edge|firefox]` - Build the extension; output to `dist/<browser>/`
- `npm run build-debug [chrome|edge|firefox]` - Build the extension without HTML/CSS minification and include source maps in transpiled JS; output to `dist/<browser>/`
- `npm run pkg [chrome|edge|firefox]` - Compress built extension from `dist/<browser>/` into a `.zip` file and output to `pkg/`
- `npm run clean` - Clear out the contents of `dist/`
- `npm run release` - Run lint, clean, build, and pkg scripts, in that order (builds for all browsers)

## License

Apache License, Version 2.0

Copyright 2018 Matthew D. Mower (mdmower)
