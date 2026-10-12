import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// アプリの ID（package.json の name）。保存データのキーの接頭辞になる
const APP_ID = (JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { name: string }).name;

test('最初の画面に、タイトルとバージョンと、6つのタブが出る', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('バド乱数表');
  await expect(page.locator('#version')).toHaveText(/^\d+\.\d+\.\d+$/);
  const labels = ['試合', 'メンバー', '成績', '得点板', '設定', 'ヘルプ'];
  for (const label of labels) await expect(page.getByRole('navigation').getByRole('button', { name: label })).toBeVisible();
});

test('タブを切り替えられる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'メンバー' }).click();
  await expect(page.locator('#tab-content')).toHaveAttribute('data-tab', 'players');
  await expect(page.locator('#nav-players')).toHaveAttribute('aria-current', 'page');
});

test('最初の画面からインストール方法を開ける（使っている端末の説明が開いている）', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /アプリにする方法/ }).click();
  const dialog = page.locator('#install-dialog');
  await expect(dialog).toBeVisible();
  // Pixel 7 のプロファイルなので Android の説明が開いている
  await expect(dialog.locator('details[data-platform="android"]')).toHaveJSProperty('open', true);
  await expect(dialog.locator('details[data-platform="ios"]')).toHaveJSProperty('open', false);
  await dialog.getByRole('button', { name: 'とじる' }).click();
  await expect(dialog).toBeHidden();
});

test('manifest と Service Worker が使え、更新のお知らせは普段は隠れている', async ({ page }) => {
  await page.goto('/');
  expect(await page.locator('link[rel="manifest"]').getAttribute('href')).toBeTruthy();
  expect(await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active)).toBe(true);
  await expect(page.locator('#update-banner')).toBeHidden();
});

test('起動できないときは「なおす」ボタンが出て、押すと起動できる（記録と、ほかのアプリのキャッシュは消えない）', async ({ page }) => {
  await page.addInitScript((id) => {
    (window as unknown as { __bootWaitMs: number }).__bootWaitMs = 500;
    // 1回目の自動修復は済んだことにして、ボタンが出る側の動きを確かめる
    sessionStorage.setItem(`${id}:repaired-at`, String(Date.now()));
    if (!localStorage.getItem(`${id}-keep`)) localStorage.setItem(`${id}-keep`, '5');
  }, APP_ID);
  // 同じサイトにある、ほかのアプリのキャッシュ（なおすときに消えてはいけない）を用意する
  await page.goto('/');
  await page.evaluate(async () => { await caches.open('other-app-v1'); });
  // メインのスクリプトが読み込めない状況を作る
  await page.route('**/assets/*.js', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('#boot-error')).toBeVisible();

  await page.unroute('**/assets/*.js');
  await page.getByRole('button', { name: 'なおす' }).click();
  await expect(page.getByRole('navigation')).toBeVisible();
  await expect(page.locator('#boot-error')).toBeHidden();
  expect(await page.evaluate((id) => localStorage.getItem(`${id}-keep`), APP_ID)).toBe('5');
  expect(await page.evaluate(() => caches.has('other-app-v1'))).toBe(true);
});
