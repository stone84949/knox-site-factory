/**
 * Knox Site Factory lead form (Google Apps Script, free with Google Workspace).
 *
 * Lives inside the "KSF Leads" Google Sheet: Extensions > Apps Script.
 * Each request from the site adds a row to the Leads tab and emails NOTIFY_TO.
 * Setup steps: forms/README.md.
 */
const NOTIFY_TO = 'hello@knoxsitefactory.com';
const SHEET_NAME = 'Leads';
const FIELDS = ['name', 'email', 'business', 'website', 'phone', 'preferred', 'type', 'goal'];
const HEADERS = ['Received', 'Page'].concat(FIELDS, ['Status', 'Next step']);
// Channel tag from the link the visitor came in on (?src=gbp, fb, li, email...).
// It is always written in the column headed SOURCE_HEADER, at the end of the row.
// If an older Leads tab has no such column yet, the script adds the header after the
// last used column itself, so existing columns never shift.
const SOURCE_HEADER = 'Lead source';
const MAX_LEN = 2000;
const MIN_FILL_MS = 2500;

function doPost(e) {
  const p = (e && e.parameter) || {};

  // Bot checks. Answer "ok" so bots learn nothing, but store nothing.
  if (p.company_fax) return reply_(true);                  // hidden field people never see
  if (Number(p.elapsed_ms) < MIN_FILL_MS) return reply_(true); // faster than a person can type

  const lead = {};
  FIELDS.forEach((f) => { lead[f] = clean_(p[f]); });
  if (!lead.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return reply_(false, 'missing');
  }

  // Same email twice inside two minutes is a double-click, not a new lead.
  const cache = CacheService.getScriptCache();
  const key = 'lead:' + lead.email.toLowerCase();
  if (cache.get(key)) return reply_(true);
  cache.put(key, '1', 120);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = sheet_();
    const row = [new Date(), safeCell_(clean_(p.source))].concat(FIELDS.map((f) => safeCell_(lead[f])), ['New', '']);
    const sourceCol = sourceColumn_(sheet);
    while (row.length < sourceCol) row.push('');
    row[sourceCol - 1] = safeCell_(cleanSource_(p.lead_source));
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }

  try {
    MailApp.sendEmail({
      to: NOTIFY_TO,
      replyTo: lead.email,
      subject: 'New site review request: ' + (lead.business || lead.name),
      body: FIELDS.filter((f) => lead[f]).map((f) => f + ': ' + lead[f]).join('\n') +
        '\n\nFrom: ' + clean_(p.source) + '\nLead source: ' + (cleanSource_(p.lead_source) || 'none') + '\nReply to this email to answer them directly.',
    });
  } catch (err) {
    // The row is saved even if the daily email limit is hit.
    console.error('email failed: ' + err);
  }

  return reply_(true);
}

function doGet() {
  return ContentService.createTextOutput('Knox Site Factory lead form is running.');
}

/** Run once from the editor: approves access, then sends a test row and email. */
function testLead() {
  const result = doPost({ parameter: {
    source: 'editor test', lead_source: 'test', name: 'Test Lead', email: NOTIFY_TO, business: 'Test business',
    website: 'https://example.com', type: 'HVAC or mechanical', goal: 'Testing the form.', elapsed_ms: '9999',
  } });
  console.log(result.getContent());
}

function sheet_() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS.concat([SOURCE_HEADER]));
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// 1-based column for the lead source. Finds it by its header in row 1; if it's missing,
// adds the header just after the last used column (never on top of an existing column).
function sourceColumn_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol > HEADERS.length) {
    // Only look past the standard columns, so a lead's own answers are never overwritten.
    const extra = sheet.getRange(1, HEADERS.length + 1, 1, lastCol - HEADERS.length).getValues()[0];
    const found = extra.findIndex((h) => String(h).trim().toLowerCase() === SOURCE_HEADER.toLowerCase());
    if (found !== -1) return HEADERS.length + found + 1;
  }
  const col = Math.max(lastCol, HEADERS.length) + 1;
  sheet.getRange(1, col).setValue(SOURCE_HEADER);
  return col;
}

// Channel tags are short words: letters, numbers, dot, dash, underscore.
function cleanSource_(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40);
}

function clean_(value) {
  return String(value || '').trim().slice(0, MAX_LEN);
}

// Stop a submitted value from running as a spreadsheet formula.
function safeCell_(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function reply_(ok, error) {
  return ContentService.createTextOutput(JSON.stringify(ok ? { ok: true } : { ok: false, error: error }))
    .setMimeType(ContentService.MimeType.JSON);
}
