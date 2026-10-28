'use strict';
// Sample-site guardrails for the kit-based demos. Run: node --test _tests/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const SLUGS = ['plumbing', 'roofing', 'landscaping', 'electrical'];

for (const slug of SLUGS) {
  const rel = `demos/${slug}/index.html`;
  const html = read(rel);

  test(`${slug}: stays out of search and is labeled a fictional sample`, () => {
    assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
    assert.match(html, /Sample site by Knox Site Factory/);
    assert.match(html, /is a fictional business/);
    assert.match(html, /Fictional business\. Sample site by Knox Site Factory\./);
    assert.match(html, /<title>[^<]*\(Sample Site\)<\/title>/);
  });

  test(`${slug}: only reserved 555-01xx phone numbers, with click-to-call`, () => {
    const tels = [...html.matchAll(/href="tel:([^"]+)"/g)].map((m) => m[1]);
    assert.ok(tels.length >= 4, 'header, hero, contact and mobile bar call links');
    for (const t of tels) assert.match(t, /^\+1865555010\d$/);
    const shown = html.match(/\b\d{3}-\d{3}-\d{4}\b/g) || [];
    for (const n of shown) assert.match(n, /^865-555-01\d\d$/);
  });

  test(`${slug}: no invented proof (ratings, stars, review counts, license numbers)`, () => {
    assert.doesNotMatch(html, /[★☆]|\b\d(\.\d)? ?(out of 5|stars?)\b|\b\d+\+? (reviews|customers|jobs)\b/i);
    assert.doesNotMatch(html, /licen[cs]e (no|number|#)/i);
    const reviews = html.split('id="reviews"')[1].split('</section>')[0];
    const quotes = reviews.match(/<blockquote>[\s\S]*?<\/blockquote>/g) || [];
    assert.ok(quotes.length >= 2);
    for (const q of quotes) assert.match(q, /\[Placeholder\]/);
    assert.match(reviews, /Sample text, not real reviews/);
  });

  test(`${slug}: has services, Knoxville-area service area, quote form and mobile call bar`, () => {
    assert.ok((html.match(/<article class="svc/g) || []).length >= 6);
    const towns = html.split('<ul class="towns"')[1].split('</ul>')[0];
    assert.ok((towns.match(/<li>/g) || []).length >= 6);
    assert.match(html, /<form class="quote" id="quote" novalidate data-staged-form>/);
    assert.match(html, /nothing was sent/);
    assert.match(html, /<nav class="mbar" aria-label="Quick contact">/);
    assert.match(html, /<a class="skip-link" href="#main">/);
  });

  test(`${slug}: self-contained (no third-party requests) and kit files exist`, () => {
    const urls = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('tel:') && !u.startsWith('data:'));
    for (const u of urls) {
      assert.doesNotMatch(u, /^(https?:)?\/\//, `external url ${u}`);
      const target = path.join(root, 'demos', slug, u.endsWith('/') ? u + 'index.html' : u);
      assert.ok(fs.existsSync(target), `missing ${u}`);
    }
    const data = JSON.parse(html.match(/<script type="application\/json" id="sample-data">([\s\S]*?)<\/script>/)[1]);
    const keys = [...html.matchAll(/class="choice"[^>]*data-key="([^"]+)"/g)].map((m) => m[1]);
    assert.deepStrictEqual(Object.keys(data.advice).sort(), keys.sort());
  });

  test(`${slug}: every form field has a label`, () => {
    const ids = [...html.matchAll(/<(?:input|select|textarea) id="([^"]+)"/g)].map((m) => m[1]);
    for (const id of ids) assert.match(html, new RegExp(`<label for="${id}"`));
  });
}
