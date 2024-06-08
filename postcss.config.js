import purgecss from '@fullhuman/postcss-purgecss';
import path from 'path';

/** @type {import('postcss-load-config').Config} */
export default {
  plugins: [
    purgecss({
      contentFunction: (sourceFile) => {
        const name = path.basename(sourceFile).split('.')[0];
        return [`src/${name}.html`, `src/${name}.ts`, `src/css/${name}.scss`];
      },
      // TODO: Limit to options.css only
      safelist: [/^modal-/],
    }),
  ],
};
