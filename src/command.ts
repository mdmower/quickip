import {IpVersionIndex} from './interfaces';

/**
 * Handle shortcut command events
 * @param command Command ID
 */
export function handleCommand(command: string): void {
  switch (command) {
    case 'quick-copy-ipv4':
      openCopyIpWindow(IpVersionIndex.V4);
      break;
    case 'quick-copy-ipv6':
      openCopyIpWindow(IpVersionIndex.V6);
      break;
    default:
      break;
  }
}

/**
 * Open a new popup window so that we have a DOM available
 * to copy an IP address to the clipboard.
 * @param version IP version
 */
function openCopyIpWindow(version: IpVersionIndex): void {
  chrome.windows
    .create({
      url: 'copy-ip-popup.html?ip_version=' + encodeURIComponent(version),
      focused: true,
      height: 60,
      width: 400,
      type: 'popup',
    })
    .catch((error) => {
      console.error('Failed to open CopyIP window\n', error);
    });
}
