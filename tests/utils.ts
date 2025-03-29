import path from 'node:path';
import {existsSync} from 'node:fs';
import puppeteer, {Browser, BrowserContext, TargetType, WebWorker} from 'puppeteer';
import {DisplayTheme, IndividualSource, IpVersionIndex, StorageData} from '../src/lib/interfaces';
import defaultSources from '../src/lib/default-sources.json';

export const extensionPath = path.join(__dirname, '../dist/chrome');
export const sampleIPv4 = '192.0.2.2';
export const sampleIPv6 = '2001:DB8::2';

interface LaunchBrowserResult {
  browser: Browser;
  context: BrowserContext;
  worker: WebWorker;
}
export async function launchBrowser(): Promise<LaunchBrowserResult> {
  if (!existsSync(path.join(extensionPath, 'manifest.json'))) {
    throw new Error('Application must be built before running tests');
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  const context = browser.defaultBrowserContext();

  const workerTarget = await browser.waitForTarget(
    (target) => target.type() === TargetType.SERVICE_WORKER && target.url().endsWith('sw.js')
  );
  const worker = await workerTarget.worker();
  if (!worker) {
    throw new Error('Worker not available');
  }
  await waitForWorker(worker);

  return {browser, context, worker};
}

export async function waitForWorker(worker: WebWorker): Promise<void> {
  const maxWaits = 10;
  for (let i = 0; i < maxWaits; i++) {
    const ready = await worker.evaluate(
      () =>
        typeof self !== 'undefined' &&
        self instanceof ServiceWorkerGlobalScope &&
        self.serviceWorker.state === 'activated' &&
        typeof chrome !== 'undefined' &&
        !!chrome.action?.openPopup
    );
    if (!ready) {
      if (i >= maxWaits) throw new Error('Worker not ready');
      await new Promise((resolve) => setTimeout(resolve, 50));
    } else {
      break;
    }
  }
}

export function getDefaultStorageData(): StorageData {
  return {
    theme: DisplayTheme.System,
    version_states: {v4: true, v6: true},
    source_states_v4: Object.values(defaultSources.v4.sources).reduce(
      (prev, curr) => {
        prev[curr.id] = {enabled: curr.enabled, order: curr.order};
        return prev;
      },
      {} as StorageData['source_states_v4']
    ),
    source_states_v6: Object.values(defaultSources.v6.sources).reduce(
      (prev, curr) => {
        prev[curr.id] = {enabled: curr.enabled, order: curr.order};
        return prev;
      },
      {} as StorageData['source_states_v6']
    ),
  };
}

export function getDefaultSources(version: IpVersionIndex): IndividualSource[] {
  return Object.values(structuredClone(defaultSources)[version].sources);
}
