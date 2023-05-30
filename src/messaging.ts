/**
 * @license Apache-2.0
 */

import {StorageData} from './interfaces';
import {logError} from './logger';
import {isRecord} from './utils';

/**
 * Send an internal message between different parts of the extension
 * @param message JSON request object
 * sent by the handler of the message
 */
export function sendInternalMessage<T extends InternalMessage<unknown>>(message: T): void {
  sendInternalMessageAsync<T, undefined>(message).catch((error) => {
    logError('Failed to send message', error);
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

    logError('Failed to send message', error);
  });
}

export enum MessageCmd {
  Logging = 'logging',
  OffscreenDoc = 'offscreen_doc',
  SettingsUpdated = 'settings_updated',
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

export interface SettingsUpdated {
  data: Partial<StorageData>;
}

export interface OffscreenDocMessage<T> extends InternalMessage<OffscreenDoc<T>> {
  cmd: MessageCmd.OffscreenDoc;
}

export interface SettingsUpdatedMessage extends InternalMessage<SettingsUpdated> {
  cmd: MessageCmd.SettingsUpdated;
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

/**
 * Verify a message object is a context menu toggled message
 * @param message Unverified message
 */
export function isSettingsUpdatedMessage(message: unknown): message is SettingsUpdatedMessage {
  return isRecord(message) && message.cmd === MessageCmd.SettingsUpdated && isRecord(message.data);
}

/**
 * Verify a message object is an internal message
 * @param message Unverified message
 */
export function isInternalMessage(message: unknown): message is InternalMessage<unknown> {
  return (
    isRecord(message) &&
    typeof message.cmd === 'string' &&
    Object.values<string>(MessageCmd).includes(message.cmd)
  );
}
