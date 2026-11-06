import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://127.0.0.1:8899';
const OUT = '/workspace/frost_flame_qr_billing/screenshots';
fs.mkdirSync(OUT, { recursive: true });
const THEMES = ['solo_m','solo_f','friends','couple','gang','family','family_kids'];
const errors = [];
const results = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

async function checkPage(name, url, fn) {
  const page = await context.newPage();
  const cons = [];
  page.on('console', m => { if (m.type() === 'error') cons.push(m.text()); });
  page.on('pageerror', e => cons.push(String(e)));
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (!resp || !resp.ok()) errors.push(`${name}: HTTP ${resp && resp.status()}`);
    await page.waitForTimeout(800);
    if (fn) await fn(page);
    const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    if (overflow.sw > overflow.cw + 4) errors.push(`${name}: horizontal overflow ${overflow.sw}>${overflow.cw}`);
    const broken = await page.evaluate(() => [...document.images].filter(i => i.src && (!i.complete || i.naturalWidth === 0)).map(i => i.src));
    if (broken.length) errors.push(`${name}: broken images ${broken.join(', ')}`);
    const shot = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    results.push({ name, shot, cons });
    if (cons.length) errors.push(`${name}: console ${cons.join(' | ')}`);
    console.log('OK', name);
  } catch (e) {
    errors.push(`${name}: ${e.message}`);
    console.log('FAIL', name, e.message);
    try { await page.screenshot({ path: path.join(OUT, `${name}_FAIL.png`), fullPage: true }); } catch {}
  } finally {
    await page.close();
  }
}

for (const t of THEMES) {
  await checkPage(`theme_${t}`, `${BASE}/index.html?table=4&group=${t}&fast=1`, async (page) => {
    const cls = await page.evaluate(() => document.body.className);
    if (!cls.includes('theme-' + t)) errors.push(`theme_${t}: missing body class (${cls})`);
    if (!(await page.locator('#ffThemeBar').isVisible())) errors.push(`theme_${t}: theme bar`);
    if (!(await page.locator('#ffPeace').isVisible())) errors.push(`theme_${t}: peace`);
    if (!(await page.locator('#ffFacts').isVisible())) errors.push(`theme_${t}: facts`);
    if ((await page.locator('.menu-item').count()) < 5) errors.push(`theme_${t}: few items`);
    if (t === 'family_kids') {
      if ((await page.locator('#ffZoneKids').count()) !== 1) errors.push('family_kids: kids zone missing');
      if ((await page.locator('#ffZoneAdults').count()) !== 1) errors.push('family_kids: adults zone missing');
      if ((await page.locator('#ffKidsColorHost svg').count()) < 1) errors.push('family_kids: colouring missing');
    }
    // games with fast=1 (~8s)
    await page.waitForFunction(() => document.getElementById('ffGamesDock')?.classList.contains('show'), null, { timeout: 15000 }).catch(() => {
      errors.push(`theme_${t}: games dock timeout`);
    });
    if (await page.locator('#ffGamesDock.show').count()) {
      await page.screenshot({ path: path.join(OUT, `theme_${t}_games.png`) });
      const opt = page.locator('#ffGamesOpts .ff-games-opt').first();
      if (await opt.count()) {
        await opt.click();
        await page.waitForTimeout(300);
        if (!(await page.locator('#ffGameModal').isVisible())) errors.push(`theme_${t}: game modal`);
        else await page.screenshot({ path: path.join(OUT, `theme_${t}_game_open.png`) });
        await page.locator('#ffGameModalClose').click();
        await page.waitForTimeout(200);
      }
    }
    // close games dock if open so tabs clickable
    await page.locator('#ffGamesClose').click().catch(()=>{});
    await page.waitForTimeout(150);
    await page.locator('#tabBill').click({ force: true });
    await page.waitForTimeout(250);
    if (!(await page.locator('#ffGoodbye').isVisible())) errors.push(`theme_${t}: goodbye`);
  });
}

await checkPage('admin', `${BASE}/admin.html`, async (page) => {
  if (!(await page.locator('#loginView').isVisible())) errors.push('admin: login');
});
await checkPage('bill_page', `${BASE}/bill.html?table=2&group=couple`);
await checkPage('greeting_flow', `${BASE}/index.html?table=1&fresh=1`, async (page) => {
  if (!(await page.locator('#ffOverlay').evaluate(el => !el.classList.contains('hide')))) errors.push('greeting: overlay');
  if (await page.locator('#ffGreetContinue').isVisible()) await page.locator('#ffGreetContinue').click();
  await page.waitForSelector('#ffWhoGrid .ff-who-btn', { timeout: 5000 });
  const count = await page.locator('#ffWhoGrid .ff-who-btn').count();
  if (count !== 7) errors.push(`greeting: ${count} who buttons`);
  await page.locator('#ffWhoGrid .ff-who-btn').nth(6).click();
  await page.waitForTimeout(400);
  if (!(await page.evaluate(() => document.body.className)).includes('theme-family_kids')) errors.push('greeting: family_kids');
  if ((await page.locator('#ffZoneKids').count()) !== 1) errors.push('greeting: kids zone after pick');
});

await browser.close();
console.log('\n=== SUMMARY ===');
console.log('shots', results.length, 'errors', errors.length);
errors.forEach(e => console.log(' -', e));
fs.writeFileSync(path.join(OUT, 'test_report.json'), JSON.stringify({ results, errors }, null, 2));
process.exit(errors.length ? 1 : 0);
