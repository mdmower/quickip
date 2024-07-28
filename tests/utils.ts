import path from 'node:path';
import {existsSync} from 'node:fs';
import puppeteer, {
  Browser,
  BrowserContext,
  PuppeteerLaunchOptions,
  TargetType,
  WebWorker,
} from 'puppeteer';
import {
  DisplayTheme,
  IndividualSource,
  IpVersionIndex,
  StorageData,
} from '../src/lib/interfaces.js';
import defaultSources from '../src/lib/default-sources.json';

export const extensionPath = path.join(__dirname, '../dist/chrome');
export const sampleIPv4 = '192.0.2.2';
export const sampleIPv6 = '2001:DB8::2';

export const puppeteerLaunchConfig: PuppeteerLaunchOptions = {
  headless: true,
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
};

interface LaunchBrowserResult {
  browser: Browser;
  context: BrowserContext;
  worker: WebWorker;
}
export async function launchBrowser(): Promise<LaunchBrowserResult> {
  if (!existsSync(path.join(extensionPath, 'manifest.json'))) {
    throw new Error('Application must be built before running tests');
  }

  const browser = await puppeteer.launch(puppeteerLaunchConfig);
  const context = browser.defaultBrowserContext();

  const workerTarget = await browser.waitForTarget(
    (target) => target.type() === TargetType.SERVICE_WORKER && target.url().endsWith('sw.js')
  );
  const workerResult = await workerTarget.worker();
  if (!workerResult) {
    throw new Error('Worker not available');
  }
  const worker = workerResult;

  const ready = await waitForWorker(worker);
  if (!ready) {
    throw new Error('Worker not ready');
  }

  return {browser, context, worker};
}

export async function waitForWorker(worker: WebWorker): Promise<boolean> {
  let ready = false;

  for (let i = 0; i < 10; i++) {
    ready = await worker.evaluate(
      () => typeof chrome !== 'undefined' && !!chrome.action?.openPopup
    );
    if (!ready) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    } else {
      continue;
    }
  }

  return ready;
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
