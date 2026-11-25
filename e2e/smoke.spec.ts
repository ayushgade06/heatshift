import { expect, test } from '@playwright/test';

test('demo day: archive down → labelled snapshot → plan → counters', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Force the documented fallback: the live archive is unreachable.
  await page.route('https://archive-api.open-meteo.com/**', (r) => r.abort());

  await page.goto('/');
  await page.getByRole('button', { name: 'Replay a Delhi heatwave day' }).click();
  await expect(page.getByText(/Cached Open-Meteo data, fetched/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Delhi, India' })).toBeVisible();

  const red = page.locator('.metric').nth(0);
  await expect(red.locator('.after')).toHaveText('4 h');
  await page.getByRole('button', { name: 'Plan safer shift' }).click();
  await expect(red.locator('.after')).toHaveText('0 h');
  await expect(page.locator('.metric').nth(1).locator('.after')).toHaveText('8 h');
  await expect(page.locator('.bar-plan')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Crew heat plan' })).toBeVisible();

  // Language switch changes the crew card.
  await page.getByLabel('Language').selectOption('hi');
  await expect(page.getByRole('heading', { name: 'टीम की गर्मी योजना' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('season replay preset computes totals from the snapshot', async ({ page }) => {
  await page.route('https://archive-api.open-meteo.com/**', (r) => r.abort());
  await page.goto('/');
  await page.getByRole('tab', { name: 'Season replay' }).click();
  await page.getByRole('button', { name: 'Delhi heatwave, May 2024' }).click();
  await expect(page.getByText(/Cached Open-Meteo data/)).toBeVisible();
  await expect(page.locator('.heatmap-row')).toHaveCount(32); // header + 31 days
  await expect(page.locator('.season-totals .metric').first().locator('.before')).toHaveText('165');
});

test('invalid season range shows inline validation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Season replay' }).click();
  await page.getByLabel('Start').fill('2024-04-01');
  await page.getByRole('button', { name: 'Run replay' }).click();
  await expect(page.getByText(/at most 31 days/)).toBeVisible();
});

test('phone width: no horizontal page scroll', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.route('https://archive-api.open-meteo.com/**', (r) => r.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Replay a Delhi heatwave day' }).click();
  await page.getByRole('button', { name: 'Plan safer shift' }).click();
  await expect(page.getByRole('heading', { name: 'Crew heat plan' })).toBeVisible();
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(sw).toBeLessThanOrEqual(cw);
});
