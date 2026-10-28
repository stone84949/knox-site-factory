# Knox Site Factory design reference

## Logo

Use the existing Sawtooth logo kit in `assets/logo`. The mark combines a factory roof, browser window and single call button. Use `ksf-logo-horizontal.svg` on light surfaces and its supplied reverse version on dark surfaces. Do not recreate it as an orange K.

## Colors

Tokens: ground #F3F5F2, ground-2 #E7ECE8, paper #FFFFFF, ink/spruce #0F2A24, ink-2 #2C4540, muted #4A5E58, line #CBD5D0, ember #C24E1C and ember-hi #E2622B. Use the darker ember for readable actions; the logo's brighter ember is artwork, not small text on white.

## Typography

Use the self-hosted variable Archivo in `assets/fonts/archivo-100-900.woff2`. Resource pages use normal-case Archivo headings, readable body measure and a restrained scale. The logo wordmark is outlined artwork, not live replacement text.

## Layout and depth

Preserve the interactive phone demonstration and trade-specific sample sites. Resource pages use a narrow reading column, native checkboxes, section rules and print styles. The review page uses a plain explanation and explicit email-app handoff. Keep depth where the phone simulation needs it; reading surfaces use thin rules and no decorative button glow.

## Components and boundaries

Reuse the shared logo asset, resource navigation, accessible skip link, labeled checkboxes, download link and visible email address. The homepage and review page render no inquiry form. Keep `lead-form.js` loaded for existing source-tag capture; the mailto link does not submit to a lead sheet. See [form asset notes](forms/README.md) before changing submission behavior.

Preserve fictional-demo labels and preview/noindex restrictions. Do not fabricate client results, exclusivity or ranking guarantees, or activate endpoint and analytics placeholders without the separate review and tests described in the form notes.
