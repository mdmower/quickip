/**
 * @license Apache-2.0
 */

import '../css/options.scss';
import 'bootstrap/js/dist/tab';
import Modal from 'bootstrap/js/dist/modal';
import Sortable from 'sortablejs';
import {
  DisplayThemeSetting,
  IndividualSource,
  IpVersionIndex,
  StorageData,
  StorageSourceStates,
  StorageVersionStates,
} from '../interfaces';
import {
  getDefaultSource,
  getDefaultVersion,
  getOrderedSources,
  getVersionData,
  getVersions,
} from '../sources';
import {clearOptions, getDefaultStorageData, setOptions} from '../storage';
import {getErrorMessage, getStorageSourceStatesIndex, isDisplayTheme} from '../utils';
import {logError, logWarn} from '../logger';
import {applyTheme} from './utils';

document.addEventListener(
  'DOMContentLoaded',
  function () {
    new QipOptions().init().catch((error) => {
      logError('Unexpected error during initialization\n', getErrorMessage(error));
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
   * Collection of options listeners
   */
  private listenerMap_: Array<ListenerConfig> = [
    {
      selector: '#theme',
      event: 'change',
      callback: this.saveOptions.bind(this),
    },
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

  /**
   * Initialize options page
   */
  public async init(): Promise<void> {
    this.initAboutVersion();
    this.initWebStoreLink();
    await applyTheme(window);
    await this.initSourceLists();
    await this.initVersionOptions();
    this.sortifyList();
    this.startListeners();
  }

  /**
   * Start listeners
   */
  private startListeners(): void {
    this.listenerMap_.forEach((listenerData) => {
      document.querySelectorAll(listenerData.selector).forEach((elm) => {
        elm.addEventListener(listenerData.event, listenerData.callback);
      });
    });
  }

  /**
   * Create source list from template
   */
  private async initSourceLists(): Promise<void> {
    for (const version of getVersions()) {
      const versionData = await getVersionData(version);

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
      const sources = await getOrderedSources(version);
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
    }
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
    const template = document.querySelector<HTMLTemplateElement>('#sortable-li-template');
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
   * Show a modal with a message
   * @param msg Message for notification
   */
  private notify(msg: string) {
    const bodyEl = document.querySelector('#notice .modal-body');
    if (!bodyEl) {
      return;
    }

    bodyEl.textContent = msg;
    new Modal('#notice').show();
  }

  /**
   * Create version selection from template
   */
  private async initVersionOptions() {
    for (const version of getVersions()) {
      const versionData = await getVersionData(version);

      // Append version options
      const template = document.querySelector<HTMLTemplateElement>('#version-states-template');
      if (!template) {
        return;
      }

      const clone = document.importNode(template.content, true);
      const id = `version-state-${version}`;

      const label = clone.querySelector('label');
      if (label) {
        label.textContent = versionData.name;
        label.htmlFor = id;
      }

      const input = clone.querySelector('input');
      if (input) {
        input.id = id;
        input.dataset.version = version;
        input.checked = versionData.enabled;
      }

      document.querySelector<HTMLDivElement>('#version-states-container')?.appendChild(clone);
    }
  }

  /**
   * Make source lists sortable
   */
  private sortifyList(): void {
    const sortableLists = document.querySelectorAll<HTMLUListElement>('ul.sortable');
    sortableLists.forEach((list) => {
      new Sortable(list, {
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
      logWarn('Unable to enable all sources\n', getErrorMessage(error));
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
      logWarn('Unable to open Chrome Shortcuts\n', getErrorMessage(error));
    });
  }

  /**
   * Handler for restoreDefaults
   */
  public restoreDefaults(): void {
    this.restoreDefaultsAsync().catch((error) => {
      logWarn('Unable to restore defaults\n', getErrorMessage(error));
    });
  }

  /**
   * Restore all settings to defaults
   */
  private async restoreDefaultsAsync(): Promise<void> {
    await clearOptions();
    await setOptions(getDefaultStorageData());
    location.reload();
  }

  /**
   * Handler for saveOptionsAsync
   */
  public saveOptions(): void {
    this.saveOptionsAsync().catch((error) => {
      logWarn('Unable to save options\n', getErrorMessage(error));
    });
  }

  /**
   * Save all options to storage
   */
  private async saveOptionsAsync(): Promise<void> {
    const options: Partial<StorageData> = {};
    let errorMessage = '';

    const theme = document.querySelector<HTMLSelectElement>('#theme')?.value;
    if (isDisplayTheme(theme)) {
      options[DisplayThemeSetting] = theme;
      await applyTheme(window, theme);
    }

    for (const version of getVersions()) {
      const sourceOrder = this.getSourceOrder(version);
      const enabledSources = this.getEnabledSources(version);
      if (!enabledSources.length) {
        const defaultSource = getDefaultSource(version);
        const defaultId = defaultSource.id;
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

      const states: Partial<StorageSourceStates> = {};
      sourceOrder.forEach((id, index) => {
        states[id] = {
          order: index,
          enabled: enabledSources.includes(id),
        };
      });
      options[getStorageSourceStatesIndex(version)] = states;
    }

    const versionInputs = document.querySelectorAll<HTMLInputElement>(
      '#version-states-container input:checked'
    );
    if (!versionInputs.length) {
      const defaultVersion = getDefaultVersion();
      const {name} = await getVersionData(defaultVersion);

      const input = document.querySelector<HTMLInputElement>(
        `#version-states-container input[data-version="${defaultVersion}"]`
      );
      if (input) {
        input.checked = true;
      }

      if (!errorMessage) {
        errorMessage = `At least one IP version must be enabled. ${name} has been automatically enabled.`;
      }
    }

    const versionStates: StorageVersionStates = {
      [IpVersionIndex.V4]:
        document.querySelector<HTMLInputElement>(
          `#version-states-container input[data-version="${IpVersionIndex.V4}"]`
        )?.checked ?? false,
      [IpVersionIndex.V6]:
        document.querySelector<HTMLInputElement>(
          `#version-states-container input[data-version="${IpVersionIndex.V6}"]`
        )?.checked ?? false,
    };
    options.version_states = versionStates;

    // Notify on error, but do not prevent options from saving since the issue
    // has been remedied.
    if (errorMessage) {
      this.notify(errorMessage);
    }

    await setOptions(options);
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
