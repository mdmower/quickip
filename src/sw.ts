/**
 * @license Apache-2.0
 */

import {handleCommand} from './lib/command';

chrome.commands.onCommand.addListener(handleCommand);
