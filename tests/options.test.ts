import {Browser, ElementHandle, Page, WebWorker} from 'puppeteer';
import {getDefaultStorageData, launchBrowser} from './utils.js';
import {
  DisplayTheme,
  DisplayThemeSetting,
  IpVersionIndex,
  StorageSourceStates,
  StorageSourceStatesIndex,
  VersionStatesIndex,
} from '../src/lib/interfaces.js';

describe('Options', () => {
  let browser: Browser;
  let worker: WebWorker;
  let page: Page;

  const getPageSourceStatuses = (version: IpVersionIndex) =>
    page.$$eval(`input.source-checkbox[data-version="${version}"]`, (inputs) =>
      inputs.map((input, order) => ({
        id: input.dataset.id || '',
        enabled: input.checked,
        order,
      }))
    );

  const findHandles = (version: IpVersionIndex) =>
    page.$$(`ul.sortable > li[data-version="${version}"] > span.handle`);

  beforeAll(async () => {
    ({browser, worker} = await launchBrowser());
  });

  beforeEach(async () => {
    await worker.evaluate(() => chrome.storage.sync.clear());
    await worker.evaluate(() => chrome.runtime.openOptionsPage());

    const optionsTarget = await browser.waitForTarget(
      (target) => target.type() === 'page' && target.url().endsWith('options.html')
    );
    const optionsPage = await optionsTarget.page();
    if (!optionsPage) {
      throw new Error('Options page did not open');
    }
    page = optionsPage;
    await page.waitForNetworkIdle();
    await page.waitForSelector('#sources-container .col:nth-child(2)', {
      timeout: 100,
      visible: true,
    });
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should have working tabs', async () => {
    const title = await page.$eval('h1', (h1) => h1.textContent);
    expect(title).toBe('QuickIP Options');

    const tabs = await page.$$('#main-nav button');
    expect(tabs).toHaveLength(2);

    const getSectionVisibilities = () =>
      page.$eval('#pills-tabContent', (div) => ({
        options: div.querySelector('#pills-options')?.checkVisibility(),
        about: div.querySelector('#pills-about')?.checkVisibility(),
      }));

    const tabTitles = await Promise.all(
      tabs.map((tab) => tab.evaluate((btn) => btn.textContent?.trim()))
    );
    expect(tabTitles).toEqual(['Options', 'About']);
    await tabs[1].click();
    expect(await getSectionVisibilities()).toEqual({options: false, about: true});
    await tabs[0].click();
    expect(await getSectionVisibilities()).toEqual({options: true, about: false});
  });

  it('should update display theme', async () => {
    const $select = await page.$('select#theme');
    expect($select).not.toBeNull();
    const value = await $select!.evaluate((select) => select.value);
    expect(value).toBe(DisplayTheme.System);

    const themeValues: string[] = [DisplayTheme.Dark, DisplayTheme.Light];

    for (const theme of Object.values(DisplayTheme)) {
      await $select!.select(theme);

      const storage = await page.evaluate((s) => chrome.storage.sync.get(s), DisplayThemeSetting);
      const storageValue = storage[DisplayThemeSetting] as unknown;
      expect(storageValue).toBe(theme);

      const pageTheme = await page.$eval('html', (html) => html.dataset.bsTheme);
      expect(
        theme === DisplayTheme.System ? themeValues.includes(pageTheme ?? '') : pageTheme === theme
      ).toBe(true);
    }
  });

  it('should update enabled IP version(s)', async () => {
    const checkedVersions = await page.$$eval('input[name="version_states"]', (inputs) =>
      inputs.map((input) => input.checked)
    );
    expect(checkedVersions).toEqual([true, true]);

    const $inputs = await page.$$('input[name="version_states"]');

    await $inputs[0].click();
    const storage1 = await page.evaluate((s) => chrome.storage.sync.get(s), VersionStatesIndex);
    const storageValue1 = storage1[VersionStatesIndex] as unknown;
    expect(storageValue1).toEqual({[IpVersionIndex.V4]: false, [IpVersionIndex.V6]: true});

    // Both versions cannot be disabled
    await $inputs[1].click();
    const storage2 = await page.evaluate((s) => chrome.storage.sync.get(s), VersionStatesIndex);
    const storageValue2 = storage2[VersionStatesIndex] as unknown;
    expect(storageValue2).toEqual({[IpVersionIndex.V4]: true, [IpVersionIndex.V6]: false});
    await page.waitForSelector('#notice', {timeout: 100, visible: true});
    const noticeShown = await page.$eval(
      'div#notice',
      (div) => div.textContent?.includes('At least one IP version') || false
    );
    expect(noticeShown).toBe(true);
  });

  it('should enable/disable sources', async () => {
    for (const version of [IpVersionIndex.V4, IpVersionIndex.V6]) {
      const initialPageStatuses = await getPageSourceStatuses(version);
      expect(initialPageStatuses.length).toBeGreaterThan(2);
      expect(initialPageStatuses.every(({enabled}) => enabled)).toBe(true);

      const $inputs = await page.$$(`input.source-checkbox[data-version="${version}"]`);
      const storageKey =
        version == IpVersionIndex.V4 ? StorageSourceStatesIndex.V4 : StorageSourceStatesIndex.V6;

      {
        await $inputs[0].click();
        await $inputs[1].click();
        const updatedPageStatuses = await getPageSourceStatuses(version);
        expect(updatedPageStatuses.map(({enabled}) => enabled)).toEqual([
          false,
          false,
          ...initialPageStatuses.slice(2).map(({enabled}) => enabled),
        ]);

        const storage = await page.evaluate((s) => chrome.storage.sync.get(s), storageKey);
        const storageValue = storage[storageKey] as StorageSourceStates;
        const expectedStatuses = Object.entries(storageValue)
          .map(([id, status]) => ({id, ...status}))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        expect(updatedPageStatuses).toEqual(expectedStatuses);
      }

      {
        await $inputs[0].click();
        const updatedPageStatuses = await getPageSourceStatuses(version);
        expect(updatedPageStatuses.map(({enabled}) => enabled)).toEqual([
          true,
          false,
          ...initialPageStatuses.slice(2).map(({enabled}) => enabled),
        ]);

        const storage = await page.evaluate((s) => chrome.storage.sync.get(s), storageKey);
        const storageValue = storage[storageKey] as StorageSourceStates;
        const expectedStatuses = Object.entries(storageValue)
          .map(([id, status]) => ({id, ...status}))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        expect(updatedPageStatuses).toEqual(expectedStatuses);
      }
    }
  });

  it('should enable all sources', async () => {
    for (const version of [IpVersionIndex.V4, IpVersionIndex.V6]) {
      const initialPageStatuses = await getPageSourceStatuses(version);
      expect(initialPageStatuses.length).toBeGreaterThan(2);
      expect(initialPageStatuses.every(({enabled}) => enabled)).toBe(true);

      const $inputs = await page.$$(`input.source-checkbox[data-version="${version}"]`);
      const $button = await page.$(`button.enable-all[data-version="${version}"]`);
      const storageKey =
        version == IpVersionIndex.V4 ? StorageSourceStatesIndex.V4 : StorageSourceStatesIndex.V6;

      await $inputs[0].click();
      await $inputs[1].click();
      await $button?.click();
      const updatedPageStatuses = await getPageSourceStatuses(version);
      expect(updatedPageStatuses.map(({enabled}) => enabled)).toEqual(
        initialPageStatuses.map(({enabled}) => enabled)
      );

      const storage = await page.evaluate((s) => chrome.storage.sync.get(s), storageKey);
      const storageValue = storage[storageKey] as StorageSourceStates;
      const expectedStatuses = Object.entries(storageValue)
        .map(([id, status]) => ({id, ...status}))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      expect(updatedPageStatuses).toEqual(expectedStatuses);
    }
  });

  it('should reorder sources', async () => {
    for (const version of [IpVersionIndex.V4, IpVersionIndex.V6]) {
      const initialPageStatuses = await getPageSourceStatuses(version);
      expect(initialPageStatuses.length).toBeGreaterThan(2);

      const storageKey =
        version == IpVersionIndex.V4 ? StorageSourceStatesIndex.V4 : StorageSourceStatesIndex.V6;

      let $handles: ElementHandle<HTMLSpanElement>[];

      const originalIdOrder = (await getPageSourceStatuses(version)).map(({id}) => id);
      $handles = await findHandles(version);
      await $handles[0].press('ArrowDown');
      $handles = await findHandles(version);
      await $handles[2].press('ArrowUp');
      $handles = await findHandles(version);
      await $handles[1].press('ArrowUp');
      const updatedPageStatuses = await getPageSourceStatuses(version);
      expect(updatedPageStatuses.map(({id}) => id)).toEqual([
        originalIdOrder[2],
        originalIdOrder[1],
        originalIdOrder[0],
        ...originalIdOrder.slice(3),
      ]);

      const storage = await page.evaluate((s) => chrome.storage.sync.get(s), storageKey);
      const storageValue = storage[storageKey] as StorageSourceStates;
      const expectedStatuses = Object.entries(storageValue)
        .map(([id, status]) => ({id, ...status}))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      expect(updatedPageStatuses).toEqual(expectedStatuses);
    }
  });

  it('should reset options', async () => {
    const $select = await page.$('select#theme');
    expect($select).not.toBeNull();
    await $select!.select(DisplayTheme.Dark);
    const pageTheme = await page.$eval('html', (html) => html.dataset.bsTheme);
    expect(pageTheme).toBe(DisplayTheme.Dark);

    const $versionInputs = await page.$$('input[name="version_states"]');
    await $versionInputs[0].click();
    const checkedVersions = await page.$$eval('input[name="version_states"]', (inputs) =>
      inputs.map((input) => input.checked)
    );
    expect(checkedVersions).toEqual([false, true]);

    const originalPageStatuses4 = await getPageSourceStatuses(IpVersionIndex.V4);
    const originalPageStatuses6 = await getPageSourceStatuses(IpVersionIndex.V6);

    const $SourceInputs4 = await page.$$(
      `input.source-checkbox[data-version="${IpVersionIndex.V4}"]`
    );
    await $SourceInputs4[0].click();
    await $SourceInputs4[1].click();

    const $SourceInputs6 = await page.$$(
      `input.source-checkbox[data-version="${IpVersionIndex.V6}"]`
    );
    await $SourceInputs6[1].click();

    let $handles: ElementHandle<HTMLSpanElement>[];
    $handles = await findHandles(IpVersionIndex.V4);
    await $handles[0].press('ArrowDown');
    $handles = await findHandles(IpVersionIndex.V6);
    await $handles[2].press('ArrowUp');

    await new Promise((r) => setTimeout(r, 250));

    const updatedPageStatuses4 = await getPageSourceStatuses(IpVersionIndex.V4);
    const updatedPageStatuses6 = await getPageSourceStatuses(IpVersionIndex.V6);

    let expectedPageStatuses4 = structuredClone(originalPageStatuses4);
    expectedPageStatuses4[0].enabled = false;
    expectedPageStatuses4[1].enabled = false;
    expectedPageStatuses4 = [
      {...expectedPageStatuses4[1], order: 0},
      {...expectedPageStatuses4[0], order: 1},
      ...expectedPageStatuses4.slice(2),
    ];

    let expectedPageStatuses6 = structuredClone(originalPageStatuses6);
    expectedPageStatuses6[1].enabled = false;
    expectedPageStatuses6 = [
      expectedPageStatuses6[0],
      {...expectedPageStatuses6[2], order: 1},
      {...expectedPageStatuses6[1], order: 2},
      ...expectedPageStatuses6.slice(3),
    ];

    expect(updatedPageStatuses4).toEqual(expectedPageStatuses4);
    expect(updatedPageStatuses6).toEqual(expectedPageStatuses6);

    await page.$eval('button#restore-defaults', (btn) => btn.click());
    await page.waitForNetworkIdle();

    const restoredTheme = await page.$eval('select#theme', (select) => select.value);
    expect(restoredTheme).toBe(DisplayTheme.System);

    const restoredVersions = await page.$$eval('input[name="version_states"]', (inputs) =>
      inputs.map((input) => input.checked)
    );
    expect(restoredVersions).toEqual([true, true]);

    const restoredPageStatuses4 = await getPageSourceStatuses(IpVersionIndex.V4);
    const restoredPageStatuses6 = await getPageSourceStatuses(IpVersionIndex.V6);
    expect(restoredPageStatuses4).toEqual(originalPageStatuses4);
    expect(restoredPageStatuses6).toEqual(originalPageStatuses6);

    const storage = await page.evaluate(() => chrome.storage.sync.get(null));
    expect(storage).toEqual(getDefaultStorageData());
  });
});
