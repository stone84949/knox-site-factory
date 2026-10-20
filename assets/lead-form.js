'use strict';

// Google Apps Script web app URL (forms/README.md).
// PLACEHOLDER: Josh replaces this with the Web app URL from Deploy > New deployment.
// It looks like https://script.google.com/macros/s/.../exec
// Until a real /exec URL is here, the forms stay in staging: they check fields but send nothing.
const KSF_FORM_ENDPOINT = 'PASTE_APPS_SCRIPT_WEB_APP_URL_HERE';
const ksfPageLoadedAt = Date.now();

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
  body.set('elapsed_ms', String(Date.now() - ksfPageLoadedAt));

  try {
    const response = await fetch(KSF_FORM_ENDPOINT, { method: 'POST', body });
    const reply = await response.json();
    return reply.ok === true;
  } catch {
    return false;
  }
}
