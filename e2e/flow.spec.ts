import { expect, test, type Page } from '@playwright/test';

const nav = (page: Page, label: string) => page.getByRole('navigation').getByRole('button', { name: label }).click();

async function addSample(page: Page) {
  await nav(page, 'メンバー');
  await page.locator('#sample-add').click();
  await expect(page.locator('#player-list li')).toHaveCount(8);
}

test('サンプル8名で、試合の開始から勝敗の記録・次の試合まで進められる', async ({ page }) => {
  await page.goto('/');
  await addSample(page);
  await expect(page.locator('#header-badge-text')).toContainText('参加中8名');

  await nav(page, '試合');
  await page.locator('#start-round').click();
  await expect(page.locator('#round-title')).toHaveText('第1試合');
  await expect(page.locator('.court')).toHaveCount(2);

  // 勝敗: タップで WIN、もう一度タップで解除
  const first = page.locator('.court').first().locator('.team').first();
  await first.click();
  await expect(first).toHaveClass(/is-win/);
  await first.click();
  await expect(first).not.toHaveClass(/is-win/);
  await first.click();

  // 未設定のコートがあるので、終了時に確認が出る
  page.once('dialog', (d) => void d.accept());
  await page.locator('#finish-round').click();
  await expect(page.locator('#round-title')).toHaveCount(0);
  await expect(page.locator('#last-result')).toContainText('第1試合');
  await expect(page.locator('#start-round')).toContainText('第2試合を開始');
});

test('リロードしても、メンバーと進行中の試合が残る', async ({ page }) => {
  await page.goto('/');
  await addSample(page);
  await nav(page, '試合');
  await page.locator('#start-round').click();
  await page.reload();
  await expect(page.locator('#round-title')).toHaveText('第1試合');
  await nav(page, 'メンバー');
  await expect(page.locator('#player-list li')).toHaveCount(8);
});

test('人数が足りないときは、開始できず、減らした面数で開始できる', async ({ page }) => {
  await page.goto('/');
  await nav(page, 'メンバー');
  await page.locator('#bulk-input').fill('A 男\nB 女\nC 男\nD 女\nE 男\nF 女');
  await page.locator('#bulk-add').click();
  await nav(page, '試合');
  await expect(page.locator('#start-round')).toBeDisabled();
  await expect(page.locator('#shortage')).toContainText('あと2名');
  await page.locator('#start-fewer').click();
  await expect(page.locator('.court')).toHaveCount(1);
  await expect(page.locator('#resting')).toBeVisible();
});

test('3試合の勝敗を記録すると、MVP と成績表が出る', async ({ page }) => {
  await page.goto('/');
  await addSample(page);
  for (let i = 0; i < 3; i++) {
    await nav(page, '試合');
    await page.locator('#start-round').click();
    for (const court of await page.locator('.court').all()) await court.locator('.team').first().click();
    await page.locator('#finish-round').click();
  }
  await nav(page, '成績');
  await expect(page.getByText('本日のMVP')).toBeVisible();
  await expect(page.locator('#stats-table tbody tr')).toHaveCount(8);
});

test('メンバー: 腕前の変更・お休み・削除ができ、入力途中の名前はタブを移っても残る', async ({ page }) => {
  await page.goto('/');
  await nav(page, 'メンバー');
  await page.locator('#player-name').fill('入力途中');
  await nav(page, '成績');
  await nav(page, 'メンバー');
  await expect(page.locator('#player-name')).toHaveValue('入力途中');
  await page.locator('#player-add').click();
  const row = page.locator('#player-list li').first();
  await expect(row).toContainText('入力途中');
  await row.locator('.chip--intermediate').click();
  await expect(row.locator('.chip--advanced')).toBeVisible();
  await row.locator('.player__active').click();
  await expect(row).toHaveClass(/is-rest/);
  page.once('dialog', (d) => void d.accept());
  await row.getByRole('button', { name: /を削除/ }).click();
  await expect(page.locator('#player-list li')).toHaveCount(0);
});
