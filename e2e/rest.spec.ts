import { expect, test, type Page } from '@playwright/test';

const nav = (page: Page, label: string) => page.getByRole('navigation').getByRole('button', { name: label }).click();

test('得点板: 加点・1手戻す・マッチポイント・決着・リセット', async ({ page }) => {
  await page.goto('/');
  await nav(page, '得点板');
  for (let i = 0; i < 14; i++) await page.locator('#score-A').click();
  await expect(page.locator('#score-A')).toHaveText('14');
  await expect(page.locator('#sb-banner')).toContainText('MATCH POINT');
  await page.locator('#score-A').click();
  await expect(page.locator('#sb-banner')).toContainText('GAME OVER');
  // 決着後は加点できない
  await page.locator('#score-B').click();
  await expect(page.locator('#score-B')).toHaveText('0');
  await page.locator('#sb-undo').click();
  await expect(page.locator('#score-A')).toHaveText('14');
  page.once('dialog', (d) => void d.accept());
  await page.locator('#sb-reset').click();
  await expect(page.locator('#score-A')).toHaveText('0');
});

test('得点板: チェンジエンドで左右が入れ替わり、点数はリロードしても残る', async ({ page }) => {
  await page.goto('/');
  await nav(page, '得点板');
  await page.locator('#score-A').click();
  await page.locator('#score-A').click();
  await page.locator('#sb-ends').click();
  await expect(page.locator('#score-B')).toHaveText('2');
  await page.reload();
  await nav(page, '得点板');
  await expect(page.locator('#score-B')).toHaveText('2');
});

test('得点板: 試合連動で、コートを読み込み、結果を試合タブに反映できる', async ({ page }) => {
  await page.goto('/');
  await nav(page, 'メンバー');
  await page.locator('#sample-add').click();
  await nav(page, '設定');
  await page.locator('#opt-sync').check();
  await nav(page, '試合');
  await page.locator('#start-round').click();
  await nav(page, '得点板');
  await page.getByRole('button', { name: 'コート1を読込' }).click();
  await expect(page.locator('#sb-reflect')).toBeDisabled();
  for (let i = 0; i < 15; i++) await page.locator('#score-A').click();
  await page.locator('#sb-reflect').click();
  await nav(page, '試合');
  await expect(page.locator('.court').first().locator('.is-win')).toHaveCount(1);
});

test('設定: コート数を変えるとバッジが変わり、QR とメンバーの保存・復元ができる', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await nav(page, '設定');
  await page.getByRole('button', { name: '3面' }).click();
  await expect(page.locator('#header-badge-text')).toContainText('コート3面(要12名)');
  await expect(page.locator('svg.qr')).toBeVisible();

  await page.locator('#restore-input').fill('佐藤 男 上級\n鈴木 女');
  await page.locator('#restore-add').click();
  await nav(page, 'メンバー');
  await expect(page.locator('#player-list li')).toHaveCount(2);
  await nav(page, '設定');
  await page.locator('#copy-members').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('佐藤 男 上級\n鈴木 女 中級');
});

test('設定: バックアップを書き出し、すべて消したあとに読み込むと元に戻る', async ({ page }) => {
  await page.goto('/');
  await nav(page, 'メンバー');
  await page.locator('#sample-add').click();
  await nav(page, '設定');
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#backup-export').click()]);
  const path = await download.path();
  page.on('dialog', (d) => void d.accept());
  await page.locator('#reset-all').click();
  await nav(page, 'メンバー');
  await expect(page.locator('#player-list li')).toHaveCount(0);
  await nav(page, '設定');
  await page.locator('input[type=file]').setInputFiles(path);
  await nav(page, 'メンバー');
  await expect(page.locator('#player-list li')).toHaveCount(8);
});

test('ヘルプ: よくある質問を開ける', async ({ page }) => {
  await page.goto('/');
  await nav(page, 'ヘルプ');
  await page.getByText('Q. 体育館に Wi-Fi').click();
  await expect(page.getByText('オフラインでも動きます')).toBeVisible();
});
