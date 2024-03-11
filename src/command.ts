import {getIp} from './actions';
import {IpVersionIndex} from './interfaces';
import {logError, logWarn} from './logger';
import {
  MessageCmd,
  OffscreenAction,
  OffscreenDocMessage,
  sendInternalMessageAsync,
} from './messaging';
import {copyIpBackground} from './pages/utils';
import {getErrorMessage} from './utils';

/**
 * Handle shortcut command events
 * @param command Command ID
 */
export function handleCommand(command: string): void {
  asyncHandleCommand(command).catch((error) => {
    logError('Failed to handle command\n', getErrorMessage(error));
  });
}

/**
 * Async handler for shortcut command events
 * @param command Command ID
 */
export async function asyncHandleCommand(command: string): Promise<void> {
  const {permissions} = await chrome.permissions.getAll();
  const needsOffscreen = !!permissions?.includes('offscreen');

  switch (command) {
    case 'quick-copy-ipv4':
      if (needsOffscreen) {
        await copyIpOffscreen(IpVersionIndex.V4);
      } else {
        await copyIpBackground(IpVersionIndex.V4);
      }
      break;
    case 'quick-copy-ipv6':
      if (needsOffscreen) {
        await copyIpOffscreen(IpVersionIndex.V6);
      } else {
        await copyIpBackground(IpVersionIndex.V6);
      }
      break;
    default:
      break;
  }
}

/**
 * Find IP address and copy to clipboard in an offscreen document
 * @param version IP version
 */
async function copyIpOffscreen(version: IpVersionIndex): Promise<void> {
  const ip = await getIp(version);
  if (!ip) {
    logWarn('copyIp: IP could not be determined, aborting.');
    return;
  }

  await chrome.offscreen.createDocument({
    justification: 'Shortcut command should copy an IP address to the clipboard',
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    url: 'offscreen.html',
  });

  try {
    const messageResponse = await sendInternalMessageAsync<
      OffscreenDocMessage<string>,
      OffscreenDocMessage<string>
    >({
      cmd: MessageCmd.OffscreenDoc,
      data: {
        action: OffscreenAction.CopyIp,
        data: ip,
      },
    });

    if (messageResponse?.data?.data === undefined) {
      logError('Offscreen document did not complete copy IP procedure');
    }
  } catch (ex) {
    logError('Failed to communicate with offscreen document\n', getErrorMessage(ex));
  } finally {
    await chrome.offscreen.closeDocument();
  }
}
