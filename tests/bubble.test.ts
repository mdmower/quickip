import {Browser, BrowserContext, HTTPRequest, Page, TargetType, WebWorker} from 'puppeteer';
import {isIP, isIPv4, isIPv6} from 'node:net';
import {
  getDefaultSources,
  getDefaultStorageData,
  launchBrowser,
  sampleIPv4,
  sampleIPv6,
} from './utils';
import {
  DisplayTheme,
  DisplayThemeSetting,
  IpVersionIndex,
  VersionStatesIndex,
} from '../src/lib/interfaces';

describe('Bubble', () => {
  let browser: Browser;
  let context: BrowserContext;
  let worker: WebWorker;
  let page: Page;

  let sourceRequestUrls: string[];
  const source4Urls = getDefaultSources(IpVersionIndex.V4).map((s) => new URL(s.url).href);
  const source6Urls = getDefaultSources(IpVersionIndex.V6).map((s) => new URL(s.url).href);

  const mockRequestHandler = (request: HTTPRequest, delayMs?: number) => {
    const isSource4 = source4Urls.some((url) => request.url() === url);
    const isSource6 = !isSource4 && source6Urls.some((url) => request.url() === url);
    if (!isSource4 && !isSource6) {
      void request.continue();
      return;
    }

    sourceRequestUrls.push(request.url());

    const response = {
      status: 200,
      contentType: 'text/plain',
      headers: {'access-control-allow-origin': '*'},
      body: isSource4 ? sampleIPv4 : sampleIPv6,
    };

    if (delayMs) {
      setTimeout(() => {
        void request.respond(response);
      }, delayMs);
    } else {
      void request.respond(response);
    }
  };

  beforeAll(async () => {
    ({browser, context, worker} = await launchBrowser());
  });

  beforeEach(async () => {
    sourceRequestUrls = [];
    await worker.evaluate(() => chrome.storage.sync.clear());
    await worker.evaluate(() => chrome.action.openPopup());

    const bubbleTarget = await browser.waitForTarget(
      (target) => target.type() === TargetType.PAGE && target.url().endsWith('bubble.html')
    );
    page = await bubbleTarget.asPage();
    await page.setRequestInterception(true);
    page.on('request', mockRequestHandler);

    await page.waitForNetworkIdle();
    await page.waitForSelector('input', {
      timeout: 100,
      visible: true,
    });
    await page.evaluate(() => navigator.clipboard.writeText(''));
  });

  afterEach(async () => {
    await context.clearPermissionOverrides();
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should use display theme', async () => {
    const htmlThemes: string[] = [DisplayTheme.Dark, DisplayTheme.Light];

    for (const theme of Object.values(DisplayTheme)) {
      await page.evaluate((s) => chrome.storage.sync.set(s), {
        [DisplayThemeSetting]: theme,
      });
      await page.reload({waitUntil: 'load'});

      const htmlTheme = await page.$eval('html', (html) => html.dataset.bsTheme);
      expect(
        theme === DisplayTheme.System ? htmlThemes.includes(htmlTheme ?? '') : htmlTheme === theme
      ).toBe(true);
    }
  });

  it('should show loading messages', async () => {
    page.off('request', mockRequestHandler);
    page.on('request', (request) => mockRequestHandler(request, 500));
    await page.reload({waitUntil: 'load'});
    await page.waitForSelector('input', {
      timeout: 100,
      visible: true,
    });

    const evalInputs = await page.$$eval('input', (inputs) =>
      inputs.map((el) => ({value: el.value, placeholder: el.placeholder}))
    );
    expect(evalInputs).toHaveLength(2);
    for (const {value, placeholder} of evalInputs) {
      expect(value).toBe('');
      expect(placeholder).toBe('Loading...');
    }
  });

  it('should find IPs', async () => {
    const evalInputs = await page.$$eval('input', (inputs) =>
      inputs.map((el) => ({value: el.value}))
    );
    expect(evalInputs).toHaveLength(2);
    for (const {value} of evalInputs) {
      expect(isIP(value)).toBeTruthy();
    }
  });

  it('should copy IPs', async () => {
    await context.overridePermissions(page.url(), ['clipboard-read']);

    const evalInputs = await page.$$eval('input', (inputs) =>
      inputs.map((el) => ({value: el.value}))
    );
    expect(evalInputs).toHaveLength(2);

    const $buttons = await page.$$('button');
    expect($buttons).toHaveLength(2);

    for (let i = 0; i < $buttons.length; i++) {
      const $button = $buttons[i];
      await $button.click();
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toBe(evalInputs[i].value);
    }
  });

  it('should focus first copy button', async () => {
    await page.keyboard.type(' ');

    const ip = await page.$eval('input', (input) => input.value);
    expect(isIPv4(ip)).toBe(true);

    await context.overridePermissions(page.url(), ['clipboard-read']);
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(ip);
  });

  it('should only show enabled IP version(s)', async () => {
    let $inputs = await page.$$('input');
    expect($inputs).toHaveLength(2);

    const settings = getDefaultStorageData();
    settings[VersionStatesIndex].v6 = false;
    await worker.evaluate((s) => chrome.storage.sync.set(s), settings);
    await page.reload({waitUntil: 'networkidle0'});

    $inputs = await page.$$('input');
    expect($inputs).toHaveLength(1);
    const ip4 = await $inputs[0].evaluate((input) => input.value);
    expect(ip4).toBe(sampleIPv4);

    settings[VersionStatesIndex].v4 = false;
    settings[VersionStatesIndex].v6 = true;
    await worker.evaluate((s) => chrome.storage.sync.set(s), settings);
    await page.reload({waitUntil: 'networkidle0'});

    $inputs = await page.$$('input');
    expect($inputs).toHaveLength(1);
    const ip6 = await $inputs[0].evaluate((input) => input.value);
    expect(ip6).toBe(sampleIPv6);
  });

  it('should skip disabled resolvers', async () => {
    const sources4 = getDefaultSources(IpVersionIndex.V4).sort((a, b) => a.order - b.order);
    const sources6 = getDefaultSources(IpVersionIndex.V6).sort((a, b) => a.order - b.order);
    const settings = getDefaultStorageData();
    settings.source_states_v4[sources4[0].id]!.enabled = false;
    settings.source_states_v6[sources6[0].id]!.enabled = false;
    await worker.evaluate((s) => chrome.storage.sync.set(s), settings);

    sourceRequestUrls = [];
    await page.reload({waitUntil: 'networkidle0'});
    expect(sourceRequestUrls).toEqual([
      new URL(sources4[1].url).href,
      new URL(sources6[1].url).href,
    ]);
  });

  it('should respect resolver order', async () => {
    const sources4 = getDefaultSources(IpVersionIndex.V4).sort((a, b) => a.order - b.order);
    const sources6 = getDefaultSources(IpVersionIndex.V6).sort((a, b) => a.order - b.order);
    const settings = getDefaultStorageData();
    for (let i = 0; i < sources4.length; i++) {
      settings.source_states_v4[sources4[i].id]!.order = sources4.length - 1 - i;
    }
    for (let i = 0; i < sources6.length; i++) {
      settings.source_states_v6[sources6[i].id]!.order = sources6.length - 1 - i;
    }
    await worker.evaluate((s) => chrome.storage.sync.set(s), settings);

    sourceRequestUrls = [];
    await page.reload({waitUntil: 'networkidle0'});
    expect(sourceRequestUrls).toEqual([
      new URL(sources4[sources4.length - 1].url).href,
      new URL(sources6[sources6.length - 1].url).href,
    ]);
  });

  // This test disables mock responses and verifies all sources are still working. It is skipped by default
  // to avoid abusing sources.
  it.skip('should get valid IPs from all sources', async () => {
    page.off('request', mockRequestHandler);
    await page.setRequestInterception(false);

    const settings = getDefaultStorageData();
    const sources4 = getDefaultSources(IpVersionIndex.V4).sort((a, b) => a.order - b.order);
    const sources6 = getDefaultSources(IpVersionIndex.V6).sort((a, b) => a.order - b.order);

    settings[VersionStatesIndex].v6 = false;
    for (const source4 of sources4) {
      for (const key of Object.keys(settings.source_states_v4)) {
        settings.source_states_v4[key]!.enabled = key === source4.id;
      }

      await worker.evaluate((s) => chrome.storage.sync.set(s), settings);
      await page.reload({waitUntil: 'networkidle0'});

      const $inputs = await page.$$('input');
      expect($inputs).toHaveLength(1);
      const ip = await $inputs[0].evaluate((input) => input.value);
      // console.log(source4.id, ip);
      expect(ip !== sampleIPv4 && isIPv4(ip)).toBe(true);
    }

    settings[VersionStatesIndex].v4 = false;
    settings[VersionStatesIndex].v6 = true;
    for (const source6 of sources6) {
      for (const key of Object.keys(settings.source_states_v6)) {
        settings.source_states_v6[key]!.enabled = key === source6.id;
      }

      await worker.evaluate((s) => chrome.storage.sync.set(s), settings);
      await page.reload({waitUntil: 'networkidle0'});

      const $inputs = await page.$$('input');
      expect($inputs).toHaveLength(1);
      const ip = await $inputs[0].evaluate((input) => input.value);
      // console.log(source6.id, ip);
      expect(ip !== sampleIPv6 && isIPv6(ip)).toBe(true);
    }
  }, 30000);
});
