/**
 * @license Apache-2.0
 */

import {IpVersionIndex} from './interfaces';
import {QipActions} from './actions';
import {QipSources} from './sources';
import {QipStorage} from './storage';

document.addEventListener(
  'DOMContentLoaded',
  function () {
    new QipBubble().init().catch((error) => {
      console.error('Unexpected error during initialization', error);
    });
  },
  false
);

class QipBubble {
  /**
   * IP sources handler
   */
  private sources_: QipSources;

  /**
   * IP actions handler
   */
  private actions_: QipActions;

  constructor() {
    const storage = new QipStorage();
    this.sources_ = new QipSources(storage);
    this.actions_ = new QipActions(this.sources_);
  }

  /**
   * Initialize bubble
   */
  public async init(): Promise<void> {
    await this.sources_.init();
    await this.actions_.init();
    this.initOutputs();
    this.startListeners();
    this.insertEnabledIPs();
  }

  /**
   * Create elements from templates for bubble
   */
  private initOutputs() {
    this.sources_.getVersions().forEach((version) => {
      const versionData = this.sources_.getVersionData(version);
      if (!versionData.enabled) {
        return;
      }

      const template = document.querySelector<HTMLTemplateElement>('#output-template');
      if (!template) {
        return;
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
    });

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
  private insertEnabledIPs() {
    this.sources_.getVersions().forEach((version) => {
      const versionData = this.sources_.getVersionData(version);
      if (!versionData.enabled) {
        return;
      }

      const input = document.querySelector<HTMLInputElement>(`input[data-version="${version}"]`);
      if (!input) {
        return;
      }

      this.insertIP(version, input).catch((error) => {
        console.error(`Failed to find and output IP${version}`, error);
      });
    });
  }

  /**
   * Request an IP address for the given version and insert it into the
   * specified input element
   * @param version IP version
   * @param input IP output element
   */
  private async insertIP(version: IpVersionIndex, input: HTMLInputElement): Promise<void> {
    const ip = await this.actions_.getIP(version);
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

    console.log(`copyIP: Contents: "${inputValue}"`);
    navigator.clipboard.writeText(inputValue).catch((error) => {
      console.log('navigator.clipboard.writeText did not succeed; using fallback method\n', error);
      document.oncopy = function (event) {
        if (event.clipboardData) {
          event.clipboardData.setData('text/plain', input.value);
          event.preventDefault();
        }
      };
      document.execCommand('copy', false, undefined);
    });

    // User feedback
    input.style.color = 'blue';
    setTimeout(() => {
      input.style.removeProperty('color');
    }, 300);
  }
}
