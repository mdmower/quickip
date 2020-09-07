/**
 * @license Apache-2.0
 */

import {QipActions} from './actions';
import {QipSources} from './sources';

document.addEventListener(
  'DOMContentLoaded',
  function () {
    new QipBubble().init();
  },
  false
);

class QipBubble {
  private sources_: QipSources;
  private actions_: QipActions;

  constructor() {
    const {sources, actions} = chrome.extension.getBackgroundPage()?.qipBackground || {};
    if (!sources || !actions) {
      throw new Error('Background page is missing shared objects');
    }
    this.sources_ = sources;
    this.actions_ = actions;
  }

  /**
   * Initialize bubble
   */
  init() {
    this.initOutputs();
    this.startListeners();
    this.insertIP();
  }

  /**
   * Create elements from templates for bubble
   */
  initOutputs() {
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
  startListeners() {
    Array.from(document.querySelectorAll('button')).forEach((button) => {
      button.addEventListener('click', this.copyIP.bind(this));
    });
  }

  /**
   * For each enabled IP version, request an IP address and insert
   * it into the bubble output (<input readonly>)
   */
  insertIP() {
    this.sources_.getVersions().forEach((version) => {
      const versionData = this.sources_.getVersionData(version);
      if (!versionData.enabled) {
        return;
      }

      let ids = this.sources_.getOrderedEnabledSourceIds(version);
      if (!ids.length) {
        ids = [this.sources_.getDefaultSourceId(version)];
      }

      const input = document.querySelector<HTMLInputElement>(`input[data-version="${version}"]`);
      if (!input) {
        return;
      }

      this.actions_
        .requestIP(version, ids, 0)
        .then((ip) => {
          input.value = ip;
          if (version === 'v6') {
            input.setAttribute('size', '39');
          }
        })
        .catch((error) => {
          console.log(`insertIP (version ${version}): Unable to complete request\n`, error);
          input.value = '';
          input.placeholder = 'Not Found';
        });
    });
  }

  /**
   * Handle 'Copy' button clicks to write an IP to the clipboard
   * @param event Mouse click event
   */
  copyIP(event: MouseEvent) {
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
    if (inputValue) {
      console.log(`copyIP: Contents: "${inputValue}"`);
      navigator.clipboard.writeText(inputValue).catch((error) => {
        console.log(
          'navigator.clipboard.writeText did not succeed; using fallback method\n',
          error
        );
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
}
