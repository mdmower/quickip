/**
 * @license Apache-2.0
 */

import 'bootstrap/js/dist/tab';
import Modal from 'bootstrap/js/dist/modal';
import Sortable from 'sortablejs';
import {
  DisplayThemeSetting,
  IndividualSource,
  IpVersionIndex,
  VersionStatesIndex,
} from './lib/interfaces';
import {
  getDefaultSource,
  getDefaultSourcesData,
  getDefaultVersion,
  getOrderedSources,
  getVersionData,
  getVersions,
} from './lib/sources';
import {
  clearOptions,
  getDefaultStorageData,
  getIndividualStorageData,
  setOptions,
} from './lib/storage';
import {
  getErrorMessage,
  getStorageSourceStatesIndex,
  isDisplayTheme,
  isIpVersionIndex,
} from './lib/utils';
import {logError, logWarn} from './lib/logger';
import {applyTheme} from './utils';
import {qipBrowser} from './lib/global';

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
  private listenerMap_: ListenerConfig[] = [
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
      selector: '#edge-keyboard-shortcut-config,#chrome-keyboard-shortcut-config',
      event: 'click',
      callback: this.openShortcutsConfig.bind(this),
    },
    {
      selector: '#restore-defaults',
      event: 'click',
      callback: this.restoreDefaults.bind(this),
    },
  ];

  private sortableRef_: {
    [IpVersionIndex.V4]?: Sortable;
    [IpVersionIndex.V6]?: Sortable;
  } = {};

  /**
   * Initialize options page
   */
  public async init(): Promise<void> {
    this.initAboutVersion();
    this.initKeyboardShortcutInfo();
    this.initWebStoreLink();
    await applyTheme(window);
    await this.restoreOptions();
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

    document.addEventListener('keydown', (event) => {
      if (document.activeElement?.matches('.sortable li .handle')) {
        const li = document.activeElement.closest('li');
        if (li) {
          this.sortListItem(event, li);
        }
      }
    });
  }

  /**
   * Restore standard options
   */
  private async restoreOptions(): Promise<void> {
    const theme = await getIndividualStorageData<typeof DisplayThemeSetting>(DisplayThemeSetting);
    const themeEl = document.querySelector<HTMLSelectElement>('#theme');
    if (themeEl) {
      themeEl.value = theme;
    }
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
        titleNode.textContent = versionData.name;
      }

      clone.querySelectorAll<HTMLElement>('.enable-all,.sortable').forEach((elm) => {
        elm.dataset.version = version;
      });

      document.querySelector<HTMLDivElement>('#sources-container')?.appendChild(clone);

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

    clone.querySelectorAll<HTMLElement>('li,input').forEach((elm) => {
      elm.dataset.version = version;
      elm.dataset.id = source.id;
    });

    if (source.enabled) {
      const sourceInput = clone.querySelector<HTMLInputElement>('input');
      if (sourceInput) {
        sourceInput.checked = true;
      }
    }

    const anchor = clone.querySelector<HTMLAnchorElement>('a');
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
   * Populate keyboard shortcut information
   */
  private initKeyboardShortcutInfo(): void {
    const text =
      qipBrowser === 'chrome'
        ? 'chrome://extensions/shortcuts'
        : qipBrowser === 'edge'
          ? 'edge://extensions/shortcuts'
          : qipBrowser === 'firefox'
            ? 'about:addons'
            : '';

    if (text) {
      const notice = document.getElementById(`${qipBrowser}-keyboard-shortcut-notice`);
      if (notice) {
        notice.classList.remove('d-none');
      }
      const config = document.getElementById(`${qipBrowser}-keyboard-shortcut-config`);
      if (config) {
        config.textContent = text;
      }
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
      } else if (extensionId === '{56f45803-b8a1-493c-b6e2-d915306e33eb}') {
        url = `https://addons.mozilla.org/firefox/addon/quickip/`;
        text = 'Firefox Add-ons';
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

      const label = clone.querySelector<HTMLLabelElement>('label');
      if (label) {
        label.textContent = versionData.name;
        label.htmlFor = id;
      }

      const input = clone.querySelector<HTMLInputElement>('input');
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
    for (const list of Array.from(sortableLists)) {
      const {version} = list.dataset;
      if (!isIpVersionIndex(version)) {
        continue;
      }

      this.sortableRef_[version] = new Sortable(list, {
        onUpdate: this.saveOptions.bind(this),
      });
    }
  }

  /**
   * Move sortable item by keypress
   * @param event Keyboard event
   * @param li Sortable list item
   */
  private sortListItem(event: KeyboardEvent, li: HTMLLIElement): void {
    const {key} = event;
    if (!['ArrowUp', 'ArrowDown'].includes(key)) {
      return;
    }

    const {id, version} = li.dataset;
    if (!id || !isIpVersionIndex(version)) {
      return;
    }

    const sortable = this.sortableRef_[version];
    if (!sortable) {
      return;
    }

    const order = sortable.toArray();
    const index = order.indexOf(id);
    if (
      index < 0 ||
      (key === 'ArrowUp' && index === 0) ||
      (key === 'ArrowDown' && index === order.length - 1)
    ) {
      return;
    }

    event.preventDefault();
    order.splice(index, 1);
    if (key === 'ArrowDown') {
      order.splice(index + 1, 0, id);
    } else if (key == 'ArrowUp') {
      order.splice(index - 1, 0, id);
    }
    sortable.sort(order);
    sortable.el.querySelector<HTMLSpanElement>(`li[data-id="${id}"] .handle`)?.focus();
    this.saveOptions();
  }

  /**
   * Handler for enableAllSourcesAsync
   * @param event Event that triggered this handler
   */
  private enableAllSources(event: Event): void {
    if (!(event.currentTarget instanceof HTMLButtonElement)) {
      return;
    }

    this.enableAllSourcesAsync(event.currentTarget).catch((error) => {
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
      `#sources-container input[data-version="${version}"]`
    );
    inputs.forEach((input) => {
      input.checked = true;
    });
    await this.saveOptionsAsync();
  }

  /**
   * Handle link to extension shortcut options (when <a> not allowed)
   * @param event Event that triggered this handler
   */
  private openShortcutsConfig(event: Event): void {
    event.preventDefault();

    const url =
      qipBrowser == 'chrome'
        ? 'chrome://extensions/shortcuts'
        : qipBrowser == 'edge'
          ? 'edge://extensions/shortcuts'
          : '';

    if (!url) {
      return;
    }

    chrome.tabs.create({url}).catch((error) => {
      logWarn('Unable to open shortcuts configuration page\n', getErrorMessage(error));
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
    let errorMessage = '';

    // Prepare default storage data object and safely overlay options as they
    // are validated.
    const storageData = getDefaultStorageData();

    const theme = document.querySelector<HTMLSelectElement>('#theme')?.value;
    if (isDisplayTheme(theme)) {
      storageData[DisplayThemeSetting] = theme;
      // TODO: Should probably be moved outside of saveOptions().
      await applyTheme(window, theme);
    }

    for (const version of getVersions()) {
      const sourceOrder = this.getSourceOrder(version);
      const enabledSources = this.getEnabledSources(version);
      if (!enabledSources.length) {
        const {id, name} = getDefaultSource(version);
        enabledSources.push(id);

        const input = document.querySelector<HTMLInputElement>(
          `#sources-container input[data-version="${version}"][data-id="${id}"]`
        );
        if (input) {
          input.checked = true;
        }

        if (!errorMessage) {
          errorMessage = `At least one source must be enabled for each IP version. ${name} has been automatically enabled.`;
        }
      }

      sourceOrder.forEach((id, index) => {
        const storageSourceState = storageData[getStorageSourceStatesIndex(version)][id];
        if (storageSourceState) {
          storageSourceState.order = index;
          storageSourceState.enabled = enabledSources.includes(id);
        }
      });
    }

    const versionInputs = document.querySelectorAll<HTMLInputElement>(
      '#version-states-container input:checked'
    );
    if (!versionInputs.length) {
      const version = getDefaultVersion();
      const {name} = getDefaultSourcesData()[version];

      const input = document.querySelector<HTMLInputElement>(
        `#version-states-container input[data-version="${version}"]`
      );
      if (input) {
        input.checked = true;
      }

      if (!errorMessage) {
        errorMessage = `At least one IP version must be enabled. ${name} has been automatically enabled.`;
      }
    }

    for (const version of getVersions()) {
      const versionInput = document.querySelector<HTMLInputElement>(
        `#version-states-container input[data-version="${version}"]`
      );
      if (versionInput) {
        storageData[VersionStatesIndex][version] = versionInput.checked;
      }
    }

    // Notify on error, but do not prevent options from saving since the issue
    // has been remedied.
    if (errorMessage) {
      this.notify(errorMessage);
    }

    await setOptions(storageData);
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
