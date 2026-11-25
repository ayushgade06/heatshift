// Renders public/og.png (1200×630) and docs/screenshots from the running preview build.
// Usage: npx vite preview --port 4318 & npx tsx scripts/og.ts
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env.BASE ?? 'http://localhost:4318';
const browser = await chromium.launch({ channel: 'chrome' });
mkdirSync('docs/screenshots', { recursive: true });

async function demoDay(width: number, height: number) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await page.goto(base);
  await page.getByRole('button', { name: 'Replay a Delhi heatwave day' }).click();
  await page.getByRole('button', { name: 'Plan safer shift' }).click();
  await page.locator('.metric .after', { hasText: '0 h' }).waitFor();
  await page.waitForTimeout(1200); // let counters and bars settle
  return page;
}

// OG card: the ruler + before/after, nothing else.
{
  const page = await demoDay(1200, 630);
  await page.addStyleTag({ content: '.topbar,.tabs,.inputs,.footer,.crew,.hint,.day-head button{display:none!important} .workspace{display:block} main{padding:28px 40px} .results{gap:18px}' });
  await page.screenshot({ path: 'public/og.png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await page.close();
}

// README / Devpost screenshots.
{
  const page = await demoDay(1440, 900);
  await page.screenshot({ path: 'docs/screenshots/1-day-plan.png' });
  await page.locator('.crew').screenshot({ path: 'docs/screenshots/3-crew-card.png' });
  await page.locator('#lang').selectOption('hi');
  await page.locator('.crew').screenshot({ path: 'docs/screenshots/4-crew-card-hindi.png' });
  await page.locator('#lang').selectOption('en');
  await page.getByRole('tab', { name: 'Season replay' }).click();
  await page.getByRole('button', { name: 'Delhi heatwave, May 2024' }).click();
  await page.locator('.season-totals').waitFor();
  await page.getByLabel('Show HeatShift plans').check();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'docs/screenshots/2-season-replay.png', fullPage: true });
  await page.getByRole('tab', { name: 'How it works' }).click();
  await page.screenshot({ path: 'docs/screenshots/5-how-it-works.png' });
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await page.goto(base);
  await page.getByRole('button', { name: 'Replay a Delhi heatwave day' }).click();
  await page.getByRole('button', { name: 'Plan safer shift' }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'docs/screenshots/6-phone.png' });
}

await browser.close();
console.log('Wrote public/og.png and docs/screenshots/*.png');
