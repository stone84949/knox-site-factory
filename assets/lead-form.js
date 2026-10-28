'use strict';

// Google Apps Script web app URL (forms/README.md).
// PLACEHOLDER: Josh replaces this with the Web app URL from Deploy > New deployment.
// It looks like https://script.google.com/macros/s/.../exec
// Until a real /exec URL is here, the forms stay in staging: they check fields but send nothing.
const KSF_FORM_ENDPOINT = 'PASTE_APPS_SCRIPT_WEB_APP_URL_HERE';
const ksfPageLoadedAt = Date.now();

// Lead source: links carry a channel tag such as ?src=gbp, ?src=fb, ?src=li or ?src=email
// (utm_source is the fallback). The tag is kept in sessionStorage for the rest of the visit,
// so someone who lands on one page and sends the form from another still keeps the tag.
// A newer tag in the same visit replaces the older one.
const KSF_SRC_KEY = 'ksf_lead_source';

function ksfCleanSource(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40);
}

function ksfSessionStore() {
  try {
    return window.sessionStorage;
  } catch {
    return null; // storage blocked (private mode, strict privacy settings)
  }
}

// Reads the tag from this page's address, remembers it, and returns the visit's tag ('' if none).
function ksfLeadSource(search, store) {
  const params = new URLSearchParams(search || '');
  const tag = ksfCleanSource(params.get('src')) || ksfCleanSource(params.get('utm_source'));
  try {
    if (tag) {
      store.setItem(KSF_SRC_KEY, tag);
      return tag;
    }
    return ksfCleanSource(store.getItem(KSF_SRC_KEY));
  } catch {
    return tag;
  }
}

if (typeof location !== 'undefined') {
  ksfLeadSource(location.search, ksfSessionStore());
}

function ksfFormLive() {
  return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(KSF_FORM_ENDPOINT);
}

// Sends a form to the lead sheet. Resolves true only when the script saved it.
async function ksfSendLead(form) {
  const body = new URLSearchParams(new FormData(form));
  const rename = { site: 'website', 'preferred-contact': 'preferred' };
  Object.keys(rename).forEach((from) => {
    if (body.has(from)) {
      body.set(rename[from], body.get(from));
      body.delete(from);
    }
  });
  body.set('source', location.pathname);
  body.set('lead_source', ksfLeadSource(location.search, ksfSessionStore()));
  body.set('elapsed_ms', String(Date.now() - ksfPageLoadedAt));

  try {
    const response = await fetch(KSF_FORM_ENDPOINT, { method: 'POST', body });
    const reply = await response.json();
    return reply.ok === true;
  } catch {
    return false;
  }
}
