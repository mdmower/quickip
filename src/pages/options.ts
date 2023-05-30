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
} from '../interfaces';
import {QipSources} from '../sources';
import {QipStorage} from '../storage';
import {getDefaultStorageData} from '../default-sources';

document.addEventListener(
  'DOMContentLoaded',
  function () {
    new QipOptions().init().catch((error) => {
      console.error('Unexpected error during initialization', error);
    });
  },
  false
);

interface ListenerConfig {
  selector: string;
  event: string;
  callback: (event: Event) => void;
}

class QipOptions {
  /**
   * Storage handler
   */
  private storage_: QipStorage;

  /**
   * IP sources handler
   */
  private sources_: QipSources;

  /**
   * Collection of options listeners
   */
  private listenerMap_: Array<ListenerConfig> = [
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

  constructor() {
    this.storage_ = new QipStorage();
    this.sources_ = new QipSources(this.storage_);
  }

  /**
   * Initialize options page
   */
  public async init(): Promise<void> {
    await this.storage_.init();
    await this.sources_.init();
    this.initAboutVersion();
    this.initWebStoreLink();
    this.initSourceLists();
    this.initVersionOptions();
    this.sortifyList();
    this.startListeners();
  }

  /**
   * Start listeners
   */
  private startListeners(): void {
    /**
     * Listen for settings changes
     */
    this.storage_.addStorageChangeCallback(async () => {
      this.notify('Updated settings are available. Please refresh this page.', true);
      return Promise.resolve();
    });

    this.toggleListeners(true);
  }

  /**
   * Toggle all event listeners on/off (does not handle Sortable update listener)
   * @param enable Whether listeners should be enabled or disabled
   */
  private toggleListeners(enable: boolean): void {
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
  private initSourceLists(): void {
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
  private generateSourceListItem(
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
  private initAboutVersion(): void {
    const extensionVersion = document.querySelector<HTMLSpanElement>('#extensionVersion');
    if (extensionVersion) {
      extensionVersion.textContent = chrome.runtime.getManifest().version;
    }
  }

  /**
   * Add link to relevant web store
   */
  private initWebStoreLink(): void {
    const webStoreLink = document.querySelector<HTMLSpanElement>('#webStoreLink');
    if (webStoreLink) {
      let url;
      let text;
      const extensionId = chrome.runtime.id;
      if (extensionId === 'fminocopafmpcihgnilcacgjpcppacfn') {
        url = 'https://chrome.google.com/webstore/detail/quickip/fminocopafmpcihgnilcacgjpcppacfn';
        text = 'Chrome Web Store';
      } else if (extensionId === 'dlkccijfhgebpigilcjllgbaiedopifj') {
        url =
          'https://microsoftedge.microsoft.com/addons/detail/quickip/dlkccijfhgebpigilcjllgbaiedopifj';
        text = 'Edge Add-ons';
      }

      if (url && text) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.textContent = text;
        webStoreLink.textContent = ' / ';
        webStoreLink.appendChild(anchor);
      }
    }
  }

  /**
   * Prepare and show a modal with a message. If 'refresh' is true,
   * then a Refresh button is shown instead of 'OK' and the user must
   * refresh the page.
   * @param msg Message for notification
   * @param refresh Whether page refresh is required upon notification confirmation
   */
  private notify(msg: string, refresh?: boolean) {
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
  private initVersionOptions() {
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
  private sortifyList(): void {
    const sortableLists = document.querySelectorAll<HTMLUListElement>('ul.sortable');
    sortableLists.forEach((list) => {
      new Sortable(list, {
        ghostClass: 'ui-sortable-placeholder',
        onUpdate: this.saveOptions.bind(this),
      });
    });
  }

  /**
   * Handler for enableAllSourcesAsync
   * @param event Event that triggered this handler
   */
  private enableAllSources(event: Event): void {
    const target = event.currentTarget as HTMLButtonElement | null;
    if (!target) {
      return;
    }

    this.enableAllSourcesAsync(target).catch((error) => {
      console.warn('Unable to enable all sources', error);
    });
  }

  /**
   * Enable all sources for a specific IP version
   * @param button Button that triggered this handler
   */
  public async enableAllSourcesAsync(button: HTMLButtonElement): Promise<void> {
    const version = button.getAttribute('data-version') || '';
    const inputs = document.querySelectorAll<HTMLInputElement>(
      '#sources-container input[data-version="' + version + '"]'
    );
    inputs.forEach((input) => {
      input.checked = true;
    });
    await this.saveOptionsAsync();
  }

  /**
   * Handle link to extension shortcut options (<a> not allowed)
   * @param event Event that triggered this handler
   */
  private openShortcutsConfig(event: Event): void {
    event.preventDefault();
    chrome.tabs.create({url: 'chrome://extensions/shortcuts'}).catch((error) => {
      console.warn('Unable to open Chrome Shortcuts', error);
    });
  }

  /**
   * Handler for restoreDefaults
   */
  public restoreDefaults(): void {
    this.restoreDefaultsAsync().catch((error) => {
      console.warn('Unable to restore defaults', error);
    });
  }

  /**
   * Restore all settings to defaults
   */
  private async restoreDefaultsAsync(): Promise<void> {
    await this.storage_.clearOptions();
    await this.storage_.setOptions(getDefaultStorageData());
    await this.sources_.applySourceOptions();
    location.reload();
  }

  /**
   * Handler for saveOptionsAsync
   */
  public saveOptions(): void {
    this.saveOptionsAsync().catch((error) => {
      console.warn('Unable to save options', error);
    });
  }

  /**
   * Save all options to storage
   */
  private async saveOptionsAsync(): Promise<void> {
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
  private getSourceOrder(version: IpVersionIndex): string[] {
    const inputs = document.querySelectorAll<HTMLInputElement>(
      `#sources-container input[data-version="${version}"]`
    );
    return Array.from(inputs).map((li) => li.getAttribute('data-id') || '');
  }

  /**
   * Get the enabled sources for a specific IP version from the page
   * @param version IP version
   */
  private getEnabledSources(version: IpVersionIndex): string[] {
    const inputs = document.querySelectorAll<HTMLInputElement>(
      `#sources-container input[data-version="${version}"]`
    );
    return Array.from(inputs)
      .filter((input) => input.checked)
      .map((input) => input.getAttribute('data-id') || '');
  }
}