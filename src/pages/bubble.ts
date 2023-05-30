/**
 * @license Apache-2.0
 */

import {getIp} from '../actions';
import {IpVersionIndex} from '../interfaces';
import {logError, logInfo} from '../logger';
import {getVersionData, getVersions} from '../sources';

document.addEventListener(
  'DOMContentLoaded',
  function () {
    new QipBubble().init().catch((error) => {
      logError('Unexpected error during initialization', error);
    });
  },
  false
);

class QipBubble {
  /**
   * Initialize bubble
   */
  public async init(): Promise<void> {
    await this.initOutputs();
    this.startListeners();
    await this.insertEnabledIPs();
  }

  /**
   * Create elements from templates for bubble
   */
  private async initOutputs() {
    for (const version of getVersions()) {
      const versionData = await getVersionData(version);
      if (!versionData.enabled) {
        continue;
      }

      const template = document.querySelector<HTMLTemplateElement>('#output-template');
      if (!template) {
        continue;
      }

      const clone = document.importNode(template.content, true);

      const versionNode = clone.querySelector<HTMLSpanElement>('label span');
      if (versionNode) {
        versionNode.textContent = versionData.name;
      }

      const dataNodes = clone.querySelectorAll('input,button');
      Array.from(dataNodes).forEach((elm) => {
        elm.setAttribute('data-version', version);
      });

      const container = document.querySelector<HTMLDivElement>('#container');
      if (container) {
        container.appendChild(clone);
      }
    }

    const firstButton = document.querySelector('button');
    if (firstButton) {
      firstButton.focus();
    }
  }

  /**
   * Listen for 'Copy' button clicks
   */
  private startListeners() {
    Array.from(document.querySelectorAll('button')).forEach((button) => {
      button.addEventListener('click', this.copyIP.bind(this));
    });
  }

  /**
   * For each enabled IP version, request an IP address and insert
   * it into the bubble output (<input readonly>)
   */
  private async insertEnabledIPs() {
    for (const version of getVersions()) {
      const versionData = await getVersionData(version);
      if (!versionData.enabled) {
        continue;
      }

      const input = document.querySelector<HTMLInputElement>(`input[data-version="${version}"]`);
      if (!input) {
        continue;
      }

      this.insertIP(version, input).catch((error) => {
        logError(`Failed to find and output IP${version}`, error);
      });
    }
  }

  /**
   * Request an IP address for the given version and insert it into the
   * specified input element
   * @param version IP version
   * @param input IP output element
   */
  private async insertIP(version: IpVersionIndex, input: HTMLInputElement): Promise<void> {
    const ip = await getIp(version);
    if (ip) {
      input.value = ip;
      if (version === 'v6') {
        input.setAttribute('size', '39');
      }
    } else {
      input.value = '';
      input.placeholder = 'Not Found';
    }
  }

  /**
   * Handle 'Copy' button clicks to write an IP to the clipboard
   * @param event Mouse click event
   */
  private copyIP(event: MouseEvent) {
    const button = event.currentTarget as HTMLButtonElement | null;
    if (!button) {
      return;
    }

    const version = button.getAttribute('data-version');
    if (!version) {
      return;
    }

    const input = document.querySelector<HTMLInputElement>(`input[data-version="${version}"]`);
    if (!input) {
      return;
    }

    const inputValue = input.value;
    if (!inputValue) {
      return;
    }

    logInfo(`copyIP: Contents: "${inputValue}"`);
    navigator.clipboard.writeText(inputValue).catch((error) => {
      logError('Failed to copy IP to clipboard', error);
    });

    // User feedback
    input.style.color = 'blue';
    setTimeout(() => {
      input.style.removeProperty('color');
    }, 300);
  }
}
