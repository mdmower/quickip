import {defineConfig} from 'oxfmt';

export default defineConfig({
  bracketSpacing: false,
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 100,
  sortPackageJson: false,
  ignorePatterns: ['dist/**', 'package-lock.json', 'pkg/**', 'resources/**', 'static/icons/**'],
});
