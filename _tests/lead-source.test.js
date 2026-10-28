'use strict';
// Lead source (?src= / utm_source) tests. Run: node --test _tests/  (underscore folder: GitHub Pages/Jekyll does not publish it)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function memoryStore() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
  };
}

// Loads assets/lead-form.js as a browser page would, with a given address and session store.
function loadPage({ pathname = '/', search = '', store = memoryStore(), blocked = false, fetchImpl } = {}) {
  const window = {};
  Object.defineProperty(window, 'sessionStorage', {
    get() { if (blocked) throw new Error('SecurityError'); return store; },
  });
  const ctx = {
    window,
    location: { pathname, search },
    URLSearchParams,
    FormData: class { constructor(form) { return form.entries; } },
    fetch: fetchImpl || (async () => ({ json: async () => ({ ok: true }) })),
    Date,
  };
  vm.createContext(ctx);
  vm.runInContext(read('assets/lead-form.js'), ctx);
  return { ctx, store };
}

test('?src= is read, cleaned and kept for the visit', () => {
  const { ctx, store } = loadPage({ search: '?src=GBP' });
  assert.strictEqual(store.getItem('ksf_lead_source'), 'gbp');
  assert.strictEqual(ctx.ksfLeadSource('', store), 'gbp');
});

test('utm_source is the fallback when there is no src', () => {
  const { store } = loadPage({ search: '?utm_source=facebook&utm_medium=social' });
  assert.strictEqual(store.getItem('ksf_lead_source'), 'facebook');
  const both = loadPage({ search: '?utm_source=facebook&src=fb' });
  assert.strictEqual(both.store.getItem('ksf_lead_source'), 'fb');
});

test('lands on one page, sends from another: tag survives', async () => {
  const store = memoryStore();
  loadPage({ pathname: '/pricing.html', search: '?src=li', store });
  let sent;
  const { ctx } = loadPage({
    pathname: '/site-review/', search: '', store,
    fetchImpl: async (url, opts) => { sent = opts.body; return { json: async () => ({ ok: true }) }; },
  });
  const form = { entries: [['name', 'Pat'], ['email', 'pat@example.com'], ['site', 'https://x.com']] };
  assert.strictEqual(await ctx.ksfSendLead(form), true);
  assert.strictEqual(sent.get('lead_source'), 'li');
  assert.strictEqual(sent.get('source'), '/site-review/');
  assert.strictEqual(sent.get('website'), 'https://x.com');
});

test('a newer tag in the same visit replaces the old one', () => {
  const store = memoryStore();
  loadPage({ search: '?src=gbp', store });
  loadPage({ search: '?src=email', store });
  assert.strictEqual(store.getItem('ksf_lead_source'), 'email');
});

test('no tag and nothing stored sends an empty source', async () => {
  let sent;
  const { ctx } = loadPage({
    fetchImpl: async (url, opts) => { sent = opts.body; return { json: async () => ({ ok: true }) }; },
  });
  await ctx.ksfSendLead({ entries: [['name', 'Pat']] });
  assert.strictEqual(sent.get('lead_source'), '');
});

test('junk and formula-like tags are stripped; long tags are cut', () => {
  const { ctx } = loadPage();
  assert.strictEqual(ctx.ksfCleanSource('=HYPERLINK("x")'), 'hyperlinkx');
  assert.strictEqual(ctx.ksfCleanSource('<script>'), 'script');
  assert.strictEqual(ctx.ksfCleanSource('a'.repeat(80)).length, 40);
});

test('blocked storage does not break the page or the form', async () => {
  let sent;
  const { ctx } = loadPage({
    search: '?src=card', blocked: true,
    fetchImpl: async (url, opts) => { sent = opts.body; return { json: async () => ({ ok: true }) }; },
  });
  assert.strictEqual(await ctx.ksfSendLead({ entries: [['name', 'Pat']] }), true);
  assert.strictEqual(sent.get('lead_source'), 'card');
  // A store whose methods throw (quota / privacy mode) also falls back to the page's own tag.
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  assert.strictEqual(ctx.ksfLeadSource('?src=nd', bad), 'nd');
  assert.strictEqual(ctx.ksfLeadSource('', bad), '');
});

test('every page that a tagged link can land on loads lead-form.js', () => {
  for (const rel of ['index.html', 'site-review/index.html', 'pricing.html']) {
    assert.match(read(rel), /<script src="(\.\.\/)?assets\/lead-form\.js"><\/script>/, rel);
  }
  // pricing.html redirects at once; the script must come before the refresh.
  const pricing = read('pricing.html');
  assert.ok(pricing.indexOf('lead-form.js') < pricing.indexOf('http-equiv="refresh"'));
});

// ---- Apps Script (forms/lead-form.gs) with a fake Sheet ----

function fakeSheet(headerRow) {
  const rows = headerRow ? [headerRow.slice()] : [];
  const sheet = {
    rows,
    getLastColumn: () => rows.reduce((m, r) => Math.max(m, r.length), 0),
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => [Array.from({ length: nc }, (_, i) => (rows[r - 1] || [])[c - 1 + i] ?? '')],
      setValue: (v) => { rows[r - 1] = rows[r - 1] || []; rows[r - 1][c - 1] = v; },
    }),
    appendRow: (row) => rows.push(row.slice()),
    setFrozenRows: () => {},
  };
  return sheet;
}

function loadScript(existing) {
  const mails = [];
  const cache = new Map();
  let sheet = existing || null;
  const ctx = {
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({
      getSheetByName: () => sheet,
      insertSheet: () => { sheet = fakeSheet(); return sheet; },
    }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k), put: (k, v) => cache.set(k, v) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MailApp: { sendEmail: (m) => mails.push(m) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (t) => ({ getContent: () => t, setMimeType() { return this; } }),
    },
  };
  vm.createContext(ctx);
  vm.runInContext(read('forms/lead-form.gs'), ctx);
  return { ctx, mails, sheet: () => sheet };
}

const OLD_HEADERS = ['Received', 'Page', 'name', 'email', 'business', 'website', 'phone', 'preferred', 'type', 'goal', 'Status', 'Next step'];
const lead = (extra) => ({ parameter: Object.assign({ name: 'Pat', email: 'pat@example.com', source: '/site-review/', elapsed_ms: '9000' }, extra) });

test('new Leads tab gets a "Lead source" header at the end and rows fill it', () => {
  const { ctx, sheet } = loadScript();
  ctx.doPost(lead({ lead_source: 'gbp' }));
  const rows = sheet().rows;
  assert.deepStrictEqual([...rows[0]], OLD_HEADERS.concat(['Lead source']));
  assert.strictEqual(rows[1].length, 13);
  assert.strictEqual(rows[1][1], '/site-review/');
  assert.strictEqual(rows[1][10], 'New');
  assert.strictEqual(rows[1][12], 'gbp');
});

test('an existing tab with the old 12 headers gains the header itself; old columns stay put', () => {
  const existing = fakeSheet(OLD_HEADERS);
  existing.rows.push(['old', '/'].concat(Array(8).fill('x'), ['Called', 'Fri']));
  const { ctx, mails } = loadScript(existing);
  ctx.doPost(lead({ lead_source: 'fb' }));
  assert.deepStrictEqual([...existing.rows[0]], OLD_HEADERS.concat(['Lead source']));
  assert.strictEqual(existing.rows[1].length, 12);
  assert.strictEqual(existing.rows[2][12], 'fb');
  assert.match(mails[0].body, /Lead source: fb/);
});

test('extra columns Josh added are never overwritten; the source goes after them', () => {
  const existing = fakeSheet(OLD_HEADERS.concat(['Notes']));
  const { ctx } = loadScript(existing);
  ctx.doPost(lead({ lead_source: 'li' }));
  ctx.doPost(lead({ email: 'b@example.com', lead_source: 'email' }));
  assert.deepStrictEqual([...existing.rows[0]], OLD_HEADERS.concat(['Notes', 'Lead source']));
  assert.strictEqual(existing.rows[1][12], '');
  assert.strictEqual(existing.rows[1][13], 'li');
  assert.strictEqual(existing.rows[2][13], 'email');
});

test('a moved "Lead source" column is found by its header', () => {
  const existing = fakeSheet(OLD_HEADERS.concat(['Lead source', 'Notes']));
  const { ctx } = loadScript(existing);
  ctx.doPost(lead({ lead_source: 'yt' }));
  assert.strictEqual(existing.rows[1][12], 'yt');
  assert.strictEqual(existing.rows[1].length, 13);
});

test('no source, junk source and formula-like page are stored safely', () => {
  const { ctx, sheet, mails } = loadScript();
  ctx.doPost(lead({}));
  ctx.doPost(lead({ email: 'c@example.com', lead_source: '=IMPORTXML("x")', source: '=1+1' }));
  ctx.doPost(lead({ email: 'd@example.com', lead_source: '-2' }));
  const rows = sheet().rows;
  assert.strictEqual(rows[1][12], '');
  assert.match(mails[0].body, /Lead source: none/);
  assert.strictEqual(rows[2][12], 'importxmlx');
  assert.strictEqual(rows[2][1], "'=1+1");
  assert.strictEqual(rows[3][12], "'-2");
});

test('bot checks still store nothing', () => {
  const { ctx, sheet } = loadScript();
  ctx.doPost(lead({ company_fax: 'x', lead_source: 'gbp' }));
  ctx.doPost(lead({ elapsed_ms: '10', lead_source: 'gbp' }));
  assert.strictEqual(sheet(), null);
});
