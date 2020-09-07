/**
 * @license Apache-2.0
 */

import Sortable from 'sortablejs';

import {
  IndividualSource,
  IpVersionIndex,
  StorageData,
  StorageSourceStates,
  StorageVersionStates,
  getIpVersion,
  getStorageSourceStatesIndex,
  InternalMessage,
} from './interfaces';
import {QipSources} from './sources';
import {QipStorage} from './storage';
import {getDefaultStorageData} from './default-sources';

document.addEventListener(
  'DOMContentLoaded',
  function () {
    new QipOptions().init();
  },
  false
);

interface ListenerConfig {
  selector: string;
  event: string;
  callback: (event: Event) => void;
}

class QipOptions {
  private sources_: QipSources;
  private storage_: QipStorage;
  private listenerMap_: Array<ListenerConfig>;

  constructor() {
    const {sources, storage} = chrome.extension.getBackgroundPage()?.qipBackground || {};
    if (!sources || !storage) {
      throw new Error('Background page is missing shared objects');
    }
    this.sources_ = sources;
    this.storage_ = storage;

    /**
     * Map element selectors to events and callbacks
     */
    this.listenerMap_ = [
      {
        selector: '#version-states-container input[name="version_states"]',
        event: 'change',
        callback: this.saveOptions.bind(this),
      },
      {
        selector: '#sources-container input[data-id]',
        event: 'change',
        callback: this.saveOptions.bind(this),
      },
      {
        selector: '#sources-container .enable-all',
        event: 'click',
        callback: this.enableAllSources.bind(this),
      },
      {
        selector: '#keyboard-shortcut-config',
        event: 'click',
        callback: this.openShortcutsConfig.bind(this),
      },
      {
        selector: '#restore-defaults',
        event: 'click',
        callback: this.restoreDefaults.bind(this),
      },
    ];
  }

  /**
   * Initialize options page
   */
  init(): void {
    this.initAboutVersion();
    this.initSourceLists();
    this.initVersionOptions();
    this.sortifyList();
    this.startListeners();
  }

  /**
   * Start listeners
   */
  startListeners(): void {
    /**
     * Listen for settings changes
     */
    chrome.runtime.onMessage.addListener((request: InternalMessage) => {
      switch (request.cmd) {
        case 'settings_updated':
          this.notify('Updated settings are available. Please refresh this page.', true);
          break;
        default:
          break;
      }
    });

    this.toggleListeners(true);
  }

  /**
   * Toggle all event listeners on/off (does not handle Sortable update listener)
   * @param enable Whether listeners should be enabled or disabled
   */
  toggleListeners(enable: boolean): void {
    this.listenerMap_.forEach((listenerData) => {
      document.querySelectorAll(listenerData.selector).forEach((elm) => {
        if (enable) {
          elm.addEventListener(listenerData.event, listenerData.callback);
        } else {
          elm.removeEventListener(listenerData.event, listenerData.callback);
        }
      });
    });
  }

  /**
   * Create source list from template
   */
  initSourceLists(): void {
    const versions = this.sources_.getVersions();
    versions.forEach((version) => {
      const versionData = this.sources_.getVersionData(version);

      // Append list container to page
      const template = document.querySelector<HTMLTemplateElement>('#list-container-template');
      if (!template) {
        return;
      }

      const clone = document.importNode(template.content, true);

      const titleNode = clone.querySelector<HTMLParagraphElement>('.title');
      if (titleNode) {
        titleNode.textContent += versionData.name;
      }

      const dataSelectors = '.list-container,.enable-all,.sortable';
      clone.querySelectorAll(dataSelectors).forEach((elm) => {
        elm.setAttribute('data-version', version);
      });

      const sourcesContainer = document.querySelector<HTMLDivElement>('#sources-container');
      if (sourcesContainer) {
        sourcesContainer.appendChild(clone);
      }

      // Populate <ul> with sources
      const sources = this.sources_
        .getOrderedSourceIds(version)
        .map((id) => this.sources_.getSourceData(version, id));
      const sourceList = document.querySelector<HTMLUListElement>(
        `.sortable[data-version="${version}"]`
      );
      if (sourceList) {
        sources.forEach((source) => {
          const listItem = this.generateSourceListItem(version, source);
          if (listItem) {
            sourceList.appendChild(listItem);
          }
        });
      }
    });
  }

  /**
   * Create source option from template
   * @param version IP version
   * @param source Source data
   */
  generateSourceListItem(
    version: IpVersionIndex,
    source: IndividualSource
  ): DocumentFragment | undefined {
    const template = document.querySelector<HTMLTemplateElement>('#sortable_li_template');
    if (!template) {
      return;
    }

    const clone = document.importNode(template.content, true);

    const dataSelectors = 'li,.handle,input,a';
    clone.querySelectorAll(dataSelectors).forEach((elm) => {
      elm.setAttribute('data-version', version);
      elm.setAttribute('data-id', source.id);
    });

    if (source.enabled) {
      const sourceInput = clone.querySelector('input');
      if (sourceInput) {
        sourceInput.checked = true;
      }
    }

    const anchor = clone.querySelector('a');
    if (anchor) {
      anchor.href = source.url;
      anchor.textContent = source.name;
    }

    return clone;
  }

  /**
   * Populate version on About tab
   */
  initAboutVersion(): void {
    const extensionVersion = document.querySelector<HTMLSpanElement>('#extensionVersion');
    if (extensionVersion) {
      extensionVersion.textContent = chrome.runtime.getManifest().version;
    }
  }

  /**
   * Prepare and show a modal with a message. If 'refresh' is true,
   * then a Refresh button is shown instead of 'OK' and the user must
   * refresh the page.
   * @param msg Message for notification
   * @param refresh Whether page refresh is required upon notification confirmation
   */
  notify(msg: string, refresh?: boolean) {
    const notifyElement = document.querySelector<HTMLDivElement>('#notify');
    const notifyMsg = notifyElement?.querySelector<HTMLParagraphElement>('.msg');
    const button = notifyElement?.querySelector('button');
    if (!notifyElement || !notifyMsg || !button) {
      return;
    }

    notifyMsg.textContent = msg;

    const reload = function () {
      location.reload();
    };

    const closeModal = function (event: KeyboardEvent | MouseEvent) {
      if (
        (event.type === 'keyup' && (event as KeyboardEvent).key === 'Escape') ||
        (event.type === 'click' && (event as MouseEvent).target === button)
      ) {
        notifyElement.style.display = 'none';
        document.removeEventListener('keyup', closeModal);
      }
    };

    if (refresh) {
      button.textContent = 'Refresh';
      button.onclick = reload;
    } else {
      button.textContent = 'OK';
      button.onclick = closeModal;
      document.addEventListener('keyup', closeModal);
    }

    notifyElement.style.display = 'block';
    button.focus();
  }

  /**
   * Create version selection from template
   */
  initVersionOptions() {
    const versions = this.sources_.getVersions();
    versions.forEach((version) => {
      const versionData = this.sources_.getVersionData(version);

      // Append version options
      const template = document.querySelector<HTMLTemplateElement>('#version_states_template');
      if (!template) {
        return;
      }

      const clone = document.importNode(template.content, true);
      const label = clone.querySelector('label');
      if (label) {
        label.innerHTML += versionData.name;
      }
      const input = clone.querySelector('input');
      if (input) {
        input.setAttribute('data-version', version);
        input.checked = versionData.enabled;
      }

      const versionStatesContainer = document.querySelector<HTMLDivElement>(
        '#version-states-container'
      );
      if (versionStatesContainer) {
        versionStatesContainer.appendChild(clone);
      }
    });
  }

  /**
   * Make source lists sortable
   */
  sortifyList(): void {
    const sortableLists = document.querySelectorAll<HTMLUListElement>('ul.sortable');
    sortableLists.forEach((list) => {
      new Sortable(list, {
        ghostClass: 'ui-sortable-placeholder',
        onUpdate: this.saveOptions.bind(this),
      });
    });
  }

  /**
   * Enable all sources for a specific IP version
   * @param event Event that triggered this handler
   */
  async enableAllSources(event: Event): Promise<void> {
    const target = event.currentTarget as HTMLButtonElement | null;
    if (!target) {
      return;
    }
    const version = target.getAttribute('data-version') || '';
    const inputs = document.querySelectorAll<HTMLInputElement>(
      '#sources-container input[data-version="' + version + '"]'
    );
    inputs.forEach((input) => {
      input.checked = true;
    });
    return this.saveOptions();
  }

  /**
   * Handle link to extension shortcut options (<a> not allowed)
   * @param event Event that triggered this handler
   */
  openShortcutsConfig(event: Event): void {
    event.preventDefault();
    chrome.tabs.create({url: 'chrome://extensions/shortcuts'});
  }

  /**
   * Restore all settings to defaults
   */
  async restoreDefaults(): Promise<void> {
    await this.storage_.clearOptions();
    await this.storage_.setOptions(getDefaultStorageData());
    await this.sources_.applySourceOptions();
    location.reload();
  }

  /**
   * Save all options to storage
   */
  async saveOptions(): Promise<void> {
    const options = {} as StorageData;
    let errorMessage = '';

    const versions = this.sources_.getVersions();
    versions.forEach((version) => {
      const sourceOrder = this.getSourceOrder(version);
      const enabledSources = this.getEnabledSources(version);
      if (!enabledSources.length) {
        const defaultId = this.sources_.getDefaultSourceId(version);
        const defaultSource = this.sources_.getSourceData(version, defaultId);
        enabledSources.push(defaultId);

        const input = document.querySelector<HTMLInputElement>(
          `#sources-container input[data-version="${version}"][data-id="${defaultId}"]`
        );
        if (input) {
          input.checked = true;
        }

        if (!errorMessage) {
          errorMessage =
            'At least one source must be enabled for each IP version.' +
            ` "${defaultSource.name}" has been automatically enabled.`;
        }
      }

      const states = {} as StorageSourceStates;
      sourceOrder.forEach((id, index) => {
        states[id] = {
          order: index,
          enabled: enabledSources.includes(id),
        };
      });
      options[getStorageSourceStatesIndex(version)] = states;
    });

    const versionStates = {} as StorageVersionStates;
    let versionInputs = document.querySelectorAll<HTMLInputElement>(
      '#version-states-container input:checked'
    );
    if (!versionInputs.length) {
      const defaultVersion = this.sources_.getDefaultVersion();
      const defaultVersionData = this.sources_.getVersionData(defaultVersion);

      const input = document.querySelector<HTMLInputElement>(
        `#version-states-container input[data-version="${defaultVersion}"]`
      );
      if (input) {
        input.checked = true;
      }

      if (!errorMessage) {
        errorMessage =
          'At least one IP version must be enabled.' +
          ` "${defaultVersionData.name}" has been automatically enabled.`;
      }
    }
    versionInputs = document.querySelectorAll<HTMLInputElement>('#version-states-container input');
    versionInputs.forEach((input) => {
      const version = input.getAttribute('data-version');
      if (!version) {
        return;
      }
      versionStates[getIpVersion(version)] = input.checked;
    });
    options.version_states = versionStates;

    // Notify on error, but do not prevent options from saving since
    // the issue has been remedied.
    if (errorMessage) {
      this.notify(errorMessage);
    }

    await this.storage_.setOptions(options);
    await this.sources_.applySourceOptions();
  }

  /**
   * Get the order of sources for a specific IP version from the page
   * @param version IP version
   */
  getSourceOrder(version: IpVersionIndex): string[] {
    const inputs = document.querySelectorAll<HTMLInputElement>(
      `#sources-container input[data-version="${version}"]`
    );
    return Array.from(inputs).map((li) => li.getAttribute('data-id') || '');
  }

  /**
   * Get the enabled sources for a specific IP version from the page
   * @param version IP version
   */
  getEnabledSources(version: IpVersionIndex): string[] {
    const inputs = document.querySelectorAll<HTMLInputElement>(
      `#sources-container input[data-version="${version}"]`
    );
    return Array.from(inputs)
      .filter((input) => input.checked)
      .map((input) => input.getAttribute('data-id') || '');
  }
}
