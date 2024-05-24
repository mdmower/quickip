/**
 * @license Apache-2.0
 */

import {emptyDir} from 'fs-extra';
import {bold} from 'colors';
import {dirRef} from './utils.js';

(async function () {
  try {
    await emptyDir(dirRef.dist);
    console.log(`${bold.green('[Clean successful]')} ${dirRef.dist}`);
  } catch (ex) {
    console.error(`${bold.red('[Clean error]')} Unexpected error during cleanup\n`, ex);
    process.exit(1);
  }
})();
