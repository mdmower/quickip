# quickip-chrome

Quickly find your IPv4 and IPv6 addresses. Available at:

- [Chrome Web Store](https://chrome.google.com/webstore/detail/quickip/fminocopafmpcihgnilcacgjpcppacfn) for Google Chrome
- [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/quickip/dlkccijfhgebpigilcjllgbaiedopifj) for Microsoft Edge
- [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/{56f45803-b8a1-493c-b6e2-d915306e33eb}/) for Firefox

## Features

1. Select which IP version(s) should be reported
1. Select which resolvers should be used for each IP version
1. Copy your IP to the clipboard with a keyboard shortcut (configurable)

## Build

Clone git repository locally and then install npm packages

```
npm install
```

Available npm scripts:

- `npm run lint` - Lint your changes using eslint
- `npm run format` - Use Prettier to format your changes
- `npm run build` - Build the extension; output to `dist/`
- `npm run build-debug` - Build the extension without HTML/CSS minification and include source maps in transpiled JS; output to `dist/`
- `npm run pkg` - Compress contents of `dist/` to a `.zip` file and output to `pkg/`
- `npm run clean` - Clear out the contents of `dist/`
- `npm run release` - Run lint, clean, build, and pkg scripts, in that order

## License

Apache License, Version 2.0

Copyright 2018 Matthew D. Mower
