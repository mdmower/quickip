/**
 * @license Apache-2.0
 */

import {handleCommand} from './command';

chrome.commands.onCommand.addListener(handleCommand);
