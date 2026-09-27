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

  if (process.env.LIVE_SEARCH_QA_REAL === '1') {
    for (const city of ['Narayanganj', 'Narsingdi', 'Gazipur']) {
      const pending = page.waitForResponse(r => r.url().includes('/rpc/search_available_properties'));
      await input.fill(city);
      const response = await pending;
      assert.equal(response.status(), 200, city);
      assert.ok(Array.isArray(await response.json()));
    }
    console.log('PASS real public search in all new regions');
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
  for (const [query, label, lat, lng] of [
    ['নারায়ণগঞ্জ', 'Narayanganj', 23.613516, 90.502977],
    ['নরসিংদী', 'Narsingdi', 23.922976, 90.717676],
    ['গাজীপুর', 'Gazipur', 23.99844, 90.422344],
    ['board baz', 'Board Bazar, Gazipur', 23.9451941, 90.3827771],
    ['panchdona', 'Panchdona, Narsingdi', 23.8933608, 90.6646944],
  ]) {
    const pending = page.waitForRequest(r => r.url().includes('/rpc/search_available_properties'));
    await input.fill(query);
    const body = (await pending).postDataJSON();
    assert.equal(body.center_lat, lat);
    assert.equal(body.center_long, lng);
    await root.getByRole('link', { name: /QA rental/ }).waitFor();
    const link = await root.getByRole('link', { name: /Explore and filter/ }).getAttribute('href');
    assert.equal(new URL(link, base).searchParams.get('area'), label);
  }
  console.log('PASS regional aliases, backend coordinates and map links');
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
  await page.getByRole('button', { name: 'Switch to Bangla', exact: true }).filter({ visible: true }).click();
  await page.waitForFunction(() => document.documentElement.lang === 'bn');
  await input.fill('ধান');
  await root.getByRole('option', { name: /ধানমন্ডি/ }).waitFor();
  await root.getByRole('link', { name: /QA rental/ }).waitFor();
  await page.screenshot({ path: path.join(out, 'bangla-mobile.png') });
  console.log('PASS responsive and Bangla suggestions');
} finally { await browser.close(); }
