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
    sheet_().appendRow([new Date(), clean_(p.source)].concat(FIELDS.map((f) => safeCell_(lead[f])), ['New', '']));
  } finally {
    lock.releaseLock();
  }

  try {
    MailApp.sendEmail({
      to: NOTIFY_TO,
      replyTo: lead.email,
      subject: 'New site review request: ' + (lead.business || lead.name),
      body: FIELDS.filter((f) => lead[f]).map((f) => f + ': ' + lead[f]).join('\n') +
        '\n\nFrom: ' + clean_(p.source) + '\nReply to this email to answer them directly.',
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
    source: 'editor test', name: 'Test Lead', email: NOTIFY_TO, business: 'Test business',
    website: 'https://example.com', type: 'HVAC or mechanical', goal: 'Testing the form.', elapsed_ms: '9999',
  } });
  console.log(result.getContent());
}

function sheet_() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
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
