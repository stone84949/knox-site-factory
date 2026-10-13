# Knox Site Factory — homepage concept brief (v2, "Your phone rings")

Scope: knoxsitefactory.com homepage. Persuade mode. Local concept outside the registered repo `stone84949/knox-site-factory`; not deployed. Replaces v1 "Yard Sign" (kept as `index-v1-yard-sign.html`), which Josh rejected because the metaphor read as selling yard signs/billboards.

Audience: owners of Knoxville-area home-service businesses (HVAC, septic, garage door, plumbing), reading on a phone. Job of the page: understand the offer in one viewport, believe it's the better route, request a free 15-minute site review.

## Direction contract

THESIS: KSF builds the website that turns a search into a phone call; the page proves it by showing a sample site working on a phone and ringing "your phone", then lays out a plain, fixed, owned deal. Refuses the agency default: dark glow, floating laptop, "websites that convert", logo row, three feature cards.

OWN-WORLD: Light and crisp. Cool off-white ground #F3F5F2, deep spruce ink #0F2A24 (continuity with the facelift's green-black), one full-bleed spruce pricing section, ember #C24E1C only for primary actions and call moments. Archivo variable: wide (wdth 114–122) heavy display, normal-width body, tabular price numerals. CSS-drawn phones whose screens are real mini HTML sites.

STORY: Owner reads "A website that makes it easier to call you.", sees three plain facts (fixed $1,500, you own it, Josh in Powell), taps the sample site's Call button and watches their own phone ring. Then: five pages and what each answers, a terms comparison, honest answers to their objections plus a break-even calculator, the process, the whole price, who builds it, what's excluded, the review form.

FIRST VIEWPORT: Left ~55%: three-line headline, one-line audience sub, three fact lines with icons, ember primary CTA and outline secondary. Right: trade tabs (HVAC / Septic / Garage door) above a 300×612 phone with a sample site; a 150px "Your phone" overlaps its lower-left edge. Signature interaction: tap Call → "Calling…" overlay → small phone buzzes with "New customer · from your website" → resets after ~4s. Reduced motion skips the buzz/pulse.

FORM: code-led; seed: none (unavailable). Chosen over physical-object metaphors because the brief prioritized offer clarity.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Message review

Copy decisions made on the page (all within the approved offer):

- Kept Josh's headline. The sub names the trades, so a visitor knows in one line whether it's for them.
- Replaced the defensive "No ranking promises / No unclear ownership / No filler" trio with positive facts at the top. The honest limits moved to a plain "What the launch doesn't include" section near the end.
- The five pages are framed by the customer question each answers, which ties every inclusion to calls.
- "Three ways to get a website" compares terms only (who does the work, price certainty, ownership, contract, call focus). It names no competitors and quotes no competitor prices, and it carries a disclaimer to read every contract, including ours.
- Owner questions answer the sales objection hypotheses from `sales/objection-notes.md`: referrals, no time, "current site is fine", domain control, "will it pay for itself".
- Break-even calculator: average job value → jobs to cover the launch and the yearly care plan, captioned "arithmetic, not a forecast". It makes no ROI promise.
- Added a first-year all-in cost line: $2,688 with care, $1,500 without. Up-front totals build trust with this audience.
- Founding offer copy states it is not tied to a positive review, as the tracker requires.
- Form keeps the honest "not connected yet; nothing leaves your browser" note; the page top and footer carry a short early-launch note.

Owner-decision recommendations. These are not on the page as offers:

- (a) **Timeline.** Publish a typical timeline (e.g. "live in about N weeks after materials arrive") once delivery hours are measured on Rocky Top. Owners almost always ask "how long?" and the page can't answer yet.
- (b) **Without the care plan.** State what happens if a client declines care: who hosts, and how site files and accounts transfer. Right now "optional" leaves that open, and it's the next question after "you own it".
- (c) **Google Business Profile.** Consider a light GBP check (categories, hours, phone, link to the new site) in the launch. It's currently excluded ("business-profile management"), but local customers usually find trades there first, so a site-only launch leaves the biggest call source untouched. This fits the "makes it easier to call you" promise.
- (d) **Who writes the copy.** The offer says "plain-language copy editing", but the page says Josh drafts the words from the fit call because "I don't have time to write it" is a top objection. Confirm drafting is in scope, or adjust that answer.
- (e) **Photo and phone.** Add a founder photo (placeholder box is in place) and a real business phone number when approved. A phone-call business with no phone number is the most visible gap.
- **Pricing.** $1,500 / $99 / $1,000 founding still fit the goal (owner-sized, fixed, no lock-in). No price change recommended until the 5-conversation objection review in `objection-notes.md`.

## Before going live

Owner-gated per tracker: form endpoint and inbox, phone, founder photo, PayPal deposit test, publication approval. Sample sites use 555 numbers and fictional names. The "See sample sites" CTA scrolls to the hero demo; link to the full `demos/` sites once deployed alongside them.
