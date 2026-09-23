import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.DESKTOP_QA_URL ?? 'http://127.0.0.1:3001';
const out = path.resolve(process.env.DESKTOP_QA_OUTPUT ?? 'artifacts/desktop');
await fs.mkdir(out, {recursive:true});
const browser = await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE ? {executablePath:process.env.BROWSER_EXECUTABLE} : {})});
const results=[];
async function check(name, task) {
  try { await task(); results.push({name,status:'passed'}); console.log('PASS',name); }
  catch(error) { results.push({name,status:'failed',error:String(error)}); console.error('FAIL',name,String(error)); }
}
try {
  const context = await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light',reducedMotion:'reduce'});
  const page = await context.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  async function open(route) { await page.goto(base+route,{waitUntil:'networkidle',timeout:120000}); }
  async function noOverflow() { assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal document overflow'); }
  await check('Desktop landing and one-row search',async()=>{
    await open('/');
    await page.locator('.leaflet-container').waitFor({timeout:60000});
    assert.ok(await page.locator('.landing-copy h1').isVisible());
    const boxes=await page.locator('.landing-search-console-fields > *').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));
    assert.ok(Math.max(...boxes)-Math.min(...boxes)<2,'primary fields must share a row');
    await noOverflow();
    await page.screenshot({path:path.join(out,'desktop-home.png')});
  });
  await check('Required inputs and unsupported area',async()=>{
    const area=page.locator('.landing-search-console input[type=search]');
    assert.equal(await page.locator('.landing-search-console').evaluate(e=>e.checkValidity()),false);
    await area.fill('unsupported neighborhood');
    assert.equal(await area.evaluate(e=>e.validity.customError),true);
    await page.locator('.landing-popular-actions button').filter({hasText:'Banani'}).click();
    assert.equal(await area.evaluate(e=>e.validity.customError),false);
    await page.locator('.landing-search-console select[name=tenant]').selectOption('family');
  });
  await check('Custom budget and advanced criteria reach search URL',async()=>{
    await page.locator('.landing-search-console-budget select').selectOption('custom');
    const budget=page.locator('.landing-search-budget-custom input');
    await budget.fill('500');
    assert.equal(await budget.evaluate(e=>e.checkValidity()),false);
    await budget.fill('30000');
    await page.locator('.landing-search-more summary').click();
    await page.locator('.landing-search-more select[name=bedrooms]').selectOption('2');
    await page.locator('.landing-search-more select[name=radius]').selectOption('10');
    await page.locator('.landing-search-submit').click();
    await page.waitForURL('**/homes?**',{timeout:120000});
    const params=new URL(page.url()).searchParams;
    for(const [key,value] of Object.entries({area:'Banani, Dhaka',tenant:'family',maxRent:'30000',bedrooms:'2',radius:'10'})) assert.equal(params.get(key),value,key);
    await page.locator('.renter-map-panel .leaflet-container').waitFor({timeout:60000});
    await page.waitForFunction(()=>!document.querySelector('.renter-toolbar-apply')?.disabled || !document.querySelector('.renter-toolbar-apply')?.textContent?.includes('Searching'),{timeout:60000});
    await noOverflow();
    await page.screenshot({path:path.join(out,'desktop-search.png')});
  });
  await check('Persona tabs support keyboard selection',async()=>{
    await open('/');
    const tab=page.locator('#landing-persona-tab-renter');
    await tab.focus(); await tab.press('ArrowRight');
    assert.equal(await page.locator('#landing-persona-tab-owner').getAttribute('aria-selected'),'true');
    assert.ok((await page.locator('.landing-how-primary-link').getAttribute('href')).includes('intent=list-property'));
    await page.locator('#landing-persona-tab-owner').press('Home');
    assert.equal(await tab.getAttribute('aria-selected'),'true');
  });
  await check('FAQ disclosure opens and closes',async()=>{
    const faq=page.locator('.landing-faq details').first();
    await faq.locator('summary').click();
    assert.equal(await faq.evaluate(e=>e.open),true);
    await faq.locator('summary').click();
    assert.equal(await faq.evaluate(e=>e.open),false);
  });
  await check('Desktop themes and Bengali layout',async()=>{
    const nav=page.locator('[data-marketing-navigation]');
    await nav.locator('details summary').click();
    await page.getByRole('menuitemradio',{name:'Dark',exact:true}).click();
    assert.equal(await page.locator('html').getAttribute('data-resolved-theme'),'dark');
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:path.join(out,'desktop-dark.png')});
    await nav.getByRole('button',{name:'Switch to Bangla'}).click();
    await page.waitForFunction(()=>document.documentElement.lang==='bn');
    await noOverflow();
    await page.screenshot({path:path.join(out,'desktop-bangla.png')});
    await nav.locator('[data-language-switcher] button').filter({hasText:'EN'}).click();
    await page.waitForFunction(()=>document.documentElement.lang==='en');
    await nav.locator('details summary').click();
    await page.getByRole('menuitemradio',{name:'Light',exact:true}).click();
  });
  for(const width of [1024,1280,1920,390]) {
    await check(`Landing at ${width}px`,async()=>{
      await page.setViewportSize({width,height:900}); await open('/'); await noOverflow();
      if(width===390) assert.ok(await page.locator('[data-mobile-concept-landing]').isVisible());
      else assert.ok(await page.locator('.landing-search-console').isVisible());
      await page.screenshot({path:path.join(out,`landing-${width}.png`)});
    });
  }
  await page.setViewportSize({width:1440,height:1000});
  for(const route of ['/homes','/login','/about','/contact','/privacy','/terms']) {
    await check(`Public route ${route}`,async()=>{
      await open(route); await noOverflow();
      assert.ok((await page.locator('body').innerText()).length>100);
      assert.equal(await page.locator('[data-nextjs-dialog]').count(),0);
      await page.screenshot({path:path.join(out,`${route.slice(1)}.png`)});
    });
  }
  await check('Protected destination keeps sign-in boundary',async()=>{
    await open('/saved'); assert.ok(new URL(page.url()).pathname==='/login');
  });
  await check('No uncaught browser exceptions',async()=>assert.deepEqual(pageErrors,[]));
  await context.close();
} finally {
  await browser.close();
  await fs.writeFile(path.join(out,'verification.json'),JSON.stringify(results,null,2));
}
if(results.some(r=>r.status==='failed')) process.exitCode=1;
