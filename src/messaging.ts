/**
 * @license Apache-2.0
 */

import {logError} from './logger';
import {getErrorMessage, isRecord} from './utils';

/**
 * Send an internal message between different parts of the extension
 * @param message JSON request object
 * sent by the handler of the message
 */
export function sendInternalMessage<T extends InternalMessage<unknown>>(message: T): void {
  sendInternalMessageAsync<T, undefined>(message).catch((error) => {
    logError('Failed to send message\n', getErrorMessage(error));
  });
}

/**
 * Send an internal message between different parts of the extension
 * @param message JSON request object
 * sent by the handler of the message
 */
export async function sendInternalMessageAsync<T extends InternalMessage<unknown>, R>(
  message: T
): Promise<R | void> {
  // Debugging
  // logInfo(`Sending message: ${message.cmd}\n`, message);

  // Avoid "context invalidated" errors when extension updates but content
  // scripts on page have not been reloaded.
  if (!chrome.runtime?.id) {
    return;
  }

  return chrome.runtime.sendMessage<T, R>(message).catch((error) => {
    // There will not be a message receiver if content scripts are disabled
    // and no extension pages are open (aside from the sender page).
    if (
      isRecord(error) &&
      typeof error.message === 'string' &&
      /Receiving end does not exist\./.test(error.message)
    ) {
      return;
    }

    logError('Failed to send message\n', getErrorMessage(error));
  });
}

export enum MessageCmd {
  OffscreenDoc = 'offscreen_doc',
}

export enum OffscreenAction {
  CopyIp = 'copy_ip',
}

export interface InternalMessage<T> {
  cmd: MessageCmd;
  data?: T;
}

export interface OffscreenDoc<T> {
  action: OffscreenAction;
  data: T;
}

export interface OffscreenDocMessage<T> extends InternalMessage<OffscreenDoc<T>> {
  cmd: MessageCmd.OffscreenDoc;
}

/**
 * Verify a message object is an offscreen document message
 * @param message Unverified message
 */
export function isOffscreenDocMessage(message: unknown): message is OffscreenDocMessage<unknown> {
  return (
    isRecord(message) &&
    message.cmd === MessageCmd.OffscreenDoc &&
    isRecord(message.data) &&
    isOffscreenAction(message.data.action)
  );
}

/**
 * Verify an item is an instance of OffscreenAction
 * @param val Unverified item
 */
export function isOffscreenAction(val: unknown): val is OffscreenAction {
  return typeof val === 'string' && Object.values<string>(OffscreenAction).includes(val);
}
