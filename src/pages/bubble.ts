/**
 * @license Apache-2.0
 */

import '../css/bubble.scss';
import {getIp} from '../actions';
import {IpVersionIndex} from '../interfaces';
import {logError, logInfo} from '../logger';
import {getVersionData, getVersions} from '../sources';
import {getErrorMessage} from '../utils';
import {applyTheme} from './utils';

document.addEventListener(
  'DOMContentLoaded',
  function () {
    new QipBubble().init().catch((error) => {
      logError('Unexpected error during initialization\n', getErrorMessage(error));
    });
  },
  false
);

class QipBubble {
  /**
   * Initialize bubble
   */
  public async init(): Promise<void> {
    await applyTheme(window);
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
      const id = `output-${versionData.name}`;

      const labelEl = clone.querySelector<HTMLLabelElement>('label');
      if (labelEl) {
        labelEl.textContent = versionData.name;
        labelEl.htmlFor = id;
      }

      const inputEl = clone.querySelector<HTMLInputElement>('input');
      if (inputEl) {
        inputEl.id = id;
        inputEl.dataset.version = version;
      }

      const spanEl = clone.querySelector<HTMLSpanElement>('span');
      if (spanEl) {
        spanEl.dataset.version = version;
      }

      const buttonEl = clone.querySelector<HTMLButtonElement>('button');
      if (buttonEl) {
        buttonEl.dataset.version = version;
      }

      document.querySelector<HTMLDivElement>('#container')?.appendChild(clone);
    }

    // Focus first button
    document.querySelector('button')?.focus();
  }

  /**
   * Listen for 'Copy' button clicks
   */
  private startListeners() {
    Array.from(document.querySelectorAll<HTMLButtonElement>('button')).forEach((button) => {
      button.addEventListener('click', this.copyIP.bind(this));
    });
  }

  /**
   * For each enabled IP version, request an IP address and insert it into the
   * bubble output (<input readonly>).
   */
  private async insertEnabledIPs() {
    for (const version of getVersions()) {
      const versionData = await getVersionData(version);
      if (!versionData.enabled) {
        continue;
      }

      const input = document.querySelector<HTMLInputElement>(`input[data-version="${version}"]`);
      const span = document.querySelector<HTMLSpanElement>(`span[data-version="${version}"]`);
      if (!input || !span) {
        continue;
      }

      this.insertIP(version, input, span).catch((error) => {
        logError(`Failed to find and output IP${version}\n`, getErrorMessage(error));
      });
    }
  }

  /**
   * Request an IP address for the given version and insert it into page
   * @param version IP version
   * @param input IP output element
   * @param span Temporary sizing element
   */
  private async insertIP(
    version: IpVersionIndex,
    input: HTMLInputElement,
    span: HTMLSpanElement
  ): Promise<void> {
    const ip = await getIp(version);
    if (ip) {
      input.value = ip;
      this.resizeBody(input, span);
    } else {
      input.value = '';
      input.placeholder = 'Not found';
    }
  }

  /**
   * Increase the size of the body if necessary to accomodate a long IP address
   * @param input IP output element
   * @param span Temporary sizing element
   */
  private resizeBody(input: HTMLInputElement, span: HTMLSpanElement): void {
    input.hidden = true;
    span.hidden = false;
    span.textContent = input.value;
    document.body.style.minWidth = `${document.body.offsetWidth + 5}px`;
    span.remove();
    input.hidden = false;
  }

  /**
   * Handle 'Copy' button clicks to write an IP to the clipboard
   * @param event Mouse click event
   */
  private copyIP(event: MouseEvent) {
    if (!(event.currentTarget instanceof HTMLButtonElement)) {
      return;
    }

    const button = event.currentTarget;
    const {version} = button.dataset;
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
      logError('Failed to copy IP to clipboard\n', getErrorMessage(error));
    });

    input.focus();
    setTimeout(() => {
      input.blur();
      button.focus();
    }, 200);
  }
}
