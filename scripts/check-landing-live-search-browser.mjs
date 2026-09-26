import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.LIVE_SEARCH_QA_URL ?? 'http://localhost:3003';
const out = path.resolve(process.env.LIVE_SEARCH_QA_OUTPUT ?? 'artifacts/live-search');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1338, height: 1000 }, reducedMotion: 'reduce' });
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 180000 });
  const root = page.locator('[data-live-search]:visible');
  const input = root.getByRole('combobox');
  await input.waitFor();
  await page.locator('.leaflet-container:visible').waitFor({ timeout: 60000 });
  await page.waitForTimeout(2000);
  if (process.env.LIVE_SEARCH_QA_REAL === '1') {
    const responsePromise = page.waitForResponse(r => r.url().includes('/rpc/search_available_properties'), { timeout: 60000 });
    await input.fill('Dhan');
    const response = await responsePromise;
    assert.equal(response.status(), 200, 'real public search should succeed');
    assert.ok(Array.isArray(await response.json()));
    console.log('PASS real public rental search');
    await root.getByRole('status').filter({ hasText: /nearest|No available/ }).waitFor();
    await page.screenshot({ path: path.join(out, 'desktop-live.png') });
  }

  let mode = 'success';
  let calls = 0;
  await page.route('**/rest/v1/rpc/search_available_properties**', async route => {
    calls++;
    const body = route.request().postDataJSON();
    assert.equal(body.radius_km, 5);
    assert.equal(body.renter_tenant_type, null);
    const requestMode = mode;
    if (requestMode === 'slow') await new Promise(resolve => setTimeout(resolve, 900));
    await route.fulfill({ status: requestMode === 'error' ? 503 : 200, contentType: 'application/json', body: JSON.stringify(requestMode === 'error' ? { message: 'Unavailable' } : requestMode === 'empty' ? [] : [{ id: '11111111-1111-4111-8111-111111111111', title: requestMode === 'slow' ? 'Stale rental' : 'QA rental', address_text: 'Test address', rent_bdt: 25000, total_matches: 1 }]) }).catch(() => {});
  });
  await input.fill('Ban');
  await root.getByRole('link', { name: /QA rental/ }).waitFor();
  await page.screenshot({ path: path.join(out, 'desktop-results.png') });
  const hero = await page.locator('.landing-copy h1').boundingBox();
  const search = await root.boundingBox();
  const advanced = await page.locator('.landing-search-console').boundingBox();
  assert.ok(search.y >= hero.y + hero.height && search.y < advanced.y, 'live search belongs in the hero');
  assert.ok((await root.getByRole('link', { name: /Explore and filter/ }).getAttribute('href')).includes('area=Banani'));
  await input.press('ArrowDown');
  assert.ok(await input.getAttribute('aria-activedescendant'));
  await input.press('Enter');
  assert.equal(await input.inputValue(), 'Banani, Dhaka');
  await input.press('Escape');
  assert.equal(await input.getAttribute('aria-expanded'), 'false');
  await input.fill('Utt');
  await root.getByRole('option', { name: /Uttara/ }).click();
  assert.equal(await input.inputValue(), 'Uttara, Dhaka');
  await root.getByRole('link', { name: /QA rental/ }).waitFor();
  console.log('PASS suggestions, keyboard and rental links');

  mode = 'empty'; await input.fill('Mir');
  await root.getByRole('status').filter({ hasText: 'No available rentals' }).waitFor();
  mode = 'error'; await input.fill('Gul');
  await root.getByRole('button', { name: 'Try again' }).waitFor();
  mode = 'success'; await root.getByRole('button', { name: 'Try again' }).click();
  await root.getByRole('link', { name: /QA rental/ }).waitFor();
  mode = 'slow'; await input.fill('Dhan');
  await page.waitForTimeout(450);
  mode = 'success'; await input.fill('Ban');
  await root.getByRole('link', { name: /QA rental/ }).waitFor();
  await page.waitForTimeout(1000);
  assert.equal(await root.getByText('Stale rental').count(), 0);
  await root.getByRole('button', { name: 'Clear search' }).click();
  assert.equal(await input.inputValue(), '');
  assert.equal(await root.getByRole('link', { name: /QA rental/ }).count(), 0);
  const before = calls;
  await input.fill('unsupported neighborhood');
  await page.waitForTimeout(500);
  assert.equal(calls, before, 'unsupported queries must not call backend');
  console.log('PASS empty, retry, stale-response and clear states');

  for (const width of [1024, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await input.fill('Dhan');
    await root.getByRole('link', { name: /QA rental/ }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: path.join(out, `search-${width}.png`) });
  }
  await page.context().addCookies([{ name: 'nb_locale', value: 'bn', url: base }]);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await input.fill('ধান');
  await root.getByRole('option', { name: /ধানমন্ডি/ }).waitFor();
  await root.getByRole('link', { name: /QA rental/ }).waitFor();
  await page.screenshot({ path: path.join(out, 'bangla-mobile.png') });
  console.log('PASS responsive and Bangla suggestions');
} finally { await browser.close(); }
