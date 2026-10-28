/* Run against the local preview with an existing Playwright installation.
   NODE_PATH may point to the bundled runtime; no package installation needed. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.KNOX_PREVIEW_URL || 'http://127.0.0.1:8766';
const output = process.env.KNOX_QA_OUTPUT;
const root = path.resolve(__dirname, '..');
const pages = ['/website-self-check/index.html', '/website-self-check/before-a-redesign.html', '/site-review/index.html', '/privacy.html', '/service-details.html'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const results = [];
  try {
    if (output) fs.mkdirSync(output, { recursive: true });
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of pages) {
        const response = await page.goto(base + route);
        assert.equal(response.status(), 200);
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator('h1').count(), 1);
        assert.equal(new URL(await page.locator('header img[alt="Knox Site Factory"]').getAttribute('src'), base + route).pathname, '/assets/logo/ksf-logo-horizontal.svg', 'Use reference sawtooth logo asset');
        assert.equal(await page.locator('.brand-mark').count(), 0, 'Do not reintroduce the obsolete square K logo');
        assert.match(await page.locator('h1').evaluate(el => getComputedStyle(el).fontFamily), /Archivo/, 'Use the facelift typeface');
        assert.equal(await page.locator('h1').evaluate(el => getComputedStyle(el).textTransform), 'none', 'Reading headings use normal case');
        const type = await page.locator('h1').evaluate(el => ({ size: parseFloat(getComputedStyle(el).fontSize), tracking: parseFloat(getComputedStyle(el).letterSpacing) }));
        assert.ok(type.size <= 58 && type.tracking >= -.04 * type.size, 'Actual heading size/tracking must stay within the resource scale');
        if (await page.locator('main .btn-primary').count()) {
          assert.equal(await page.locator('main .btn-primary').first().evaluate(el => getComputedStyle(el).boxShadow), 'none', 'Resource buttons do not inherit decorative glow');
        }
        assert.equal(await page.locator('link[href$="/site.css"]').count(), 0, 'Resource pages must not load the old visual system');
        assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
        const overflow = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth,
          elements: [...document.querySelectorAll('main *, header *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => el.tagName + '.' + el.className) }));
        assert.ok(overflow.document <= width + 1 && overflow.elements.length === 0, JSON.stringify({ route, width, overflow }));
        const resources = await page.evaluate(() => [...document.querySelectorAll('a[href], link[rel="stylesheet"], script[src]')].map(el => el.getAttribute('href') || el.getAttribute('src')));
        for (const resource of resources) {
          if (/^(?:mailto:|tel:|https?:)/.test(resource)) continue;
          const url = new URL(resource, base + route);
          const file = path.join(root, decodeURIComponent(url.pathname));
          assert.ok(fs.existsSync(file), 'Missing file: ' + file);
          if (url.hash) {
            const html = fs.readFileSync(file, 'utf8');
            assert.ok(html.includes('id="' + url.hash.slice(1) + '"'), 'Missing anchor: ' + resource);
          }
        }
        if (output) await page.screenshot({ path: path.join(output, `${route.split('/').filter(Boolean).join('-')}-${width}.png`), fullPage: true });
        results.push({ route, width, status: 'PASS', checks: 'HTTP, reference sawtooth logo, Archivo type, normal-case heading, no old stylesheet, noindex, overflow, local links and anchors' });
      }
    }

    await page.goto(base + '/website-self-check/index.html');
    assert.equal(await page.locator('input[type="checkbox"]').count(), 20);
    const checkbox = page.getByRole('checkbox').first();
    assert.ok(await checkbox.evaluate(el => el.getBoundingClientRect().height <= 30), 'Checklist controls must not inherit the 50px web-form input height');
    assert.ok(await page.locator('.checklist-items label').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 16), 'Checklist text must remain readable');
    assert.equal(await page.locator('.worksheet-footer').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(243, 245, 242)', 'Worksheet footer uses the reference ground token');
    await checkbox.focus();
    await page.keyboard.press('Space');
    assert.ok(await checkbox.isChecked(), 'Checkbox must work by keyboard');
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('.worksheet-header').isVisible(), false);
    assert.equal(await page.locator('.worksheet-next').isVisible(), false);
    assert.equal(await page.locator('main').isVisible(), true);
    if (output) await page.screenshot({ path: path.join(output, 'checklist-print.png'), fullPage: true });
    await page.emulateMedia({ media: 'screen' });

    await page.goto(base + '/site-review/index.html');
    assert.equal(await page.locator('form').count(), 0, 'No non-sending form on site-review');
    const anchor = page.locator('[data-review-email]');
    const mailto = new URL(await anchor.getAttribute('href'));
    assert.equal(mailto.protocol, 'mailto:');
    assert.equal(mailto.pathname, 'hello@knoxsitefactory.com');
    assert.equal(mailto.searchParams.get('subject'), 'Website review request');
    for (const prompt of ['Business name:', 'Website address:', 'Service area:', 'Preferred reply (email or phone):']) {
      assert.ok(mailto.searchParams.get('body').includes(prompt), 'Missing email prompt ' + prompt);
    }
    assert.ok(await page.getByText('hello@knoxsitefactory.com', { exact: true }).isVisible());
    // Observe native keyboard activation while preventing an external email app launch.
    await anchor.evaluate(el => el.addEventListener('click', event => { event.preventDefault(); window.emailActivated = true; }, { once: true }));
    await anchor.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => window.emailActivated), true);
    await page.goto(base + '/website-self-check/index.html');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
    await page.keyboard.press('Enter');
    assert.equal(new URL(page.url()).hash, '#main');

    const download = await page.request.get(base + '/content/website-self-check.md');
    assert.equal(download.status(), 200);
    assert.ok((await download.text()).includes('## Pick one fix'));
    // Preserve the reference homepage interaction and add our useful resource path.
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(base + '/index.html');
    assert.equal(await page.locator('#review form').count(), 0, 'Homepage must use the owner-selected email fallback instead of a form that sends nothing');
    const homeMailto = new URL(await page.locator('#review [data-review-email]').getAttribute('href'));
    assert.equal(homeMailto.protocol, 'mailto:');
    assert.equal(homeMailto.pathname, 'hello@knoxsitefactory.com');
    assert.equal(homeMailto.searchParams.get('subject'), 'Website review request');
    for (const prompt of ['Business name:', 'Website address:', 'Service area:', 'Preferred reply (email or phone):']) {
      assert.ok(homeMailto.searchParams.get('body').includes(prompt), 'Missing homepage email prompt ' + prompt);
    }
    assert.equal(await page.locator('footer a[href="privacy.html"]').count(), 1);
    assert.equal(await page.locator('footer a[href="service-details.html"]').count(), 1);
    assert.equal(await page.locator('header img.logo').getAttribute('src'), 'assets/logo/ksf-logo-horizontal.svg');
    await page.getByRole('tab', { name: 'Septic', exact: true }).click();
    assert.equal(await page.getByRole('tab', { name: 'Septic', exact: true }).getAttribute('aria-selected'), 'true');
    await page.locator('#site-septic .s-call').click();
    await page.waitForFunction(() => document.getElementById('stage-note').textContent.includes('No call was placed'));
    await page.locator('.launch-check a[href="website-self-check/index.html"]').click();
    assert.ok(page.url().endsWith('/website-self-check/index.html'));
    await page.goto(base + '/privacy.html');
    assert.ok((await page.locator('main').innerText()).includes('analytics integration is disabled'));
    await page.goto(base + '/service-details.html');
    const details = await page.locator('main').innerText();
    assert.ok(details.includes('$750 to schedule'));
    assert.ok(details.includes('$500 to schedule'));
    assert.ok(details.includes('ask Josh for it before paying'));
    if (output) {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(base + '/site-review/index.html');
      await page.screenshot({ path: path.join(output, 'site-review-preview.png') });
      await page.goto(base + '/index.html');
      await page.screenshot({ path: path.join(output, 'combined-home-preview.png') });
    }
    assert.equal(errors.length, 0, errors.join('\n'));
    results.push({ status: 'PASS', checks: '20 checkboxes, keyboard toggle and skip link, print visibility, mailto recipient/subject/body, keyboard email activation, no web form, downloadable source, reference homepage logo/trade tabs/simulated call/checklist path, no page errors' });
    if (output) fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify(results, null, 2) + '\n');
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
