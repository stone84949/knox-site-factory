# Lead form setup (free, Google Workspace)

The site-review forms on the homepage and `/site-review/` post to a Google Apps Script web app.
Each request adds a row to a Google Sheet and emails hello@knoxsitefactory.com.
There's no third-party form service and nothing to pay for.

## One-time setup (about 5 minutes, in the Workspace account)

1. In Google Sheets, create a sheet named **KSF Leads**.
2. Open **Extensions > Apps Script**. Delete the starter code and paste in all of `lead-form.gs`. Save.
3. Pick `testLead` from the function menu and click **Run**.
   - Google asks for permission to use the sheet and send email.
   - If you see "Google hasn't verified this app", click **Advanced**, then **Go to (project)**. It's your own script.
   - A **Leads** tab with one test row should appear, and a test email should arrive.
4. Click **Deploy > New deployment**. Under **Select type**, choose **Web app**.
   - **Execute as:** Me
   - **Who has access:** Anyone
5. Click **Deploy**. Copy the **Web app URL**; it ends in `/exec`.
6. In `assets/lead-form.js`, replace `PASTE_APPS_SCRIPT_WEB_APP_URL_HERE` (the value of `KSF_FORM_ENDPOINT`) with that URL. The forms only go live when the value is a real `https://script.google.com/macros/s/.../exec` URL. Then remove the "not connected" notes on both form pages (marked `GO-LIVE` in the HTML).

If **Anyone** isn't offered in step 4, the Workspace admin console is blocking sharing outside your domain. Go to **Apps > Google Workspace > Drive and Docs > Sharing settings** and allow sharing outside the organization.

## Changing the script later

After you edit the script, go to **Deploy > Manage deployments**, edit the existing deployment, and set the version to **New version**.
This keeps the same URL, so the site doesn't need to change.

## Lead source (which link brought them)

Links to the site carry a channel tag, for example `knoxsitefactory.com/?src=gbp` or `/site-review/?src=fb`.
Tags in use: `gbp` (Google Business Profile), `fb` (Facebook), `li` (LinkedIn), `nd` (Nextdoor), `yt` (YouTube), `email`, `card` (business card / flyer).
If a link has no `src` but has `utm_source`, that is used instead.

- `assets/lead-form.js` keeps the tag for the rest of the visit (sessionStorage), so a person who lands on the homepage and sends the form from `/site-review/` keeps the tag. A newer tag in the same visit replaces the older one. `pricing.html` loads it too, because it redirects at once.
- The script writes the tag in a **Lead source** column at the end of the Leads row, and adds `Lead source: ...` to the alert email. Tags are cut to 40 letters, numbers, dots, dashes and underscores.
- **Sheet:** nothing to do by hand. A new Leads tab gets the header automatically. On an older Leads tab, the first new lead adds a `Lead source` header in the first empty column after the existing ones, so no existing column moves. Columns you add yourself after `Next step` are never written over.
- **If the script was already deployed before this change:** paste the new `lead-form.gs` into the Apps Script editor, save, then **Deploy > Manage deployments > edit > Version: New version > Deploy**. The `/exec` URL stays the same. Until then, leads still save, just without the source.
- Pages with no form script (the sample sites, `/intake/`, `404.html`) don't record a tag; send tagged links to the homepage or `/site-review/`.

## Spam protection

- A hidden field that people never see. Bots fill it in, and those requests are dropped.
- Requests filled in faster than 2.5 seconds are dropped.
- The same email sent again within 2 minutes is ignored.
- Spreadsheet formulas in answers are neutralized.
