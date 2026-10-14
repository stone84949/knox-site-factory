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
6. Paste that URL into `KSF_FORM_ENDPOINT` in `assets/lead-form.js`. Also change the "not connected" notes on both form pages.

If **Anyone** isn't offered in step 4, the Workspace admin console is blocking sharing outside your domain. Go to **Apps > Google Workspace > Drive and Docs > Sharing settings** and allow sharing outside the organization.

## Changing the script later

After you edit the script, go to **Deploy > Manage deployments**, edit the existing deployment, and set the version to **New version**.
This keeps the same URL, so the site doesn't need to change.

## Spam protection

- A hidden field that people never see. Bots fill it in, and those requests are dropped.
- Requests filled in faster than 2.5 seconds are dropped.
- The same email sent again within 2 minutes is ignored.
- Spreadsheet formulas in answers are neutralized.
