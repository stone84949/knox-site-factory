# Lead form assets (dormant)

The homepage and `/site-review/` currently render no lead form. Both use an email-app link to prepare a review request addressed to hello@knoxsitefactory.com. Opening a draft does not send email or prove inbox delivery.

`assets/lead-form.js` is still loaded on those pages and the pricing redirect. It retains lead-source tags in sessionStorage, but its form submission helpers are dormant because there is no rendered lead form. The Apps Script endpoint remains a placeholder. Replacing that placeholder alone does not restore a form.

## Restoring a web form

Restoration requires a separate reviewed change to the rendered form, submission wiring, endpoint and user-facing status messages. Keep the email-app path until the replacement is verified. Before release, test the complete rendered form through the deployed endpoint and confirm both the Sheet row and actual inbox receipt, including failure behavior. A local script test or browser check alone is insufficient.

The retained backend setup is:

1. Create a Google Sheet, open **Extensions > Apps Script**, and paste `lead-form.gs`.
2. Run `testLead` with the required Sheets/email permissions and verify its test row and email.
3. Deploy a web app with **Execute as: Me** and the access setting required for public submissions. Review that access as part of the restoration change.
4. Use its `https://script.google.com/macros/s/.../exec` URL as `KSF_FORM_ENDPOINT` only in that reviewed change.
5. For later backend changes, edit the existing deployment and select **New version** to retain its URL. Repeat the end-to-end form and inbox test.

## Retained lead-source and spam checks

The JavaScript accepts `src` or, as a fallback, `utm_source`, cleans the tag to 40 letters, numbers, dots, dashes and underscores, and retains it for the visit. The backend can append a **Lead source** column without moving existing columns. These assets do not establish active lead capture on the current pages.

The backend retains a honeypot, a 2.5-second minimum completion time, two-minute email deduplication and spreadsheet-formula neutralization. Review and test them when restoring submission.
