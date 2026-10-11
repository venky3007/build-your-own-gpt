# Security summary: "Build Your Own GPT" course site

**For InfoSec reviewers. One page. Every statement below was checked against the source code and the live site on 10 Oct 2026.**

## What it is
A self-paced AI-literacy course: 9 explanatory steps plus a click-to-build "Build your GPT" sprint with a **simulated** chat. All documents, companies, people, policies, invoices and data in the course are fictional.

## Hosting
- Static HTML, JavaScript and CSS only, served over HTTPS from GitHub Pages: https://venky3007.github.io/build-your-own-gpt/
- Live response headers (curl -I): `server: GitHub.com`, `strict-transport-security: max-age=31556952`. No `Set-Cookie` header.
- No server-side code, database, login, accounts or SSO.

## Data flows
- **Outbound: none.** The code contains no `fetch`, `XMLHttpRequest`, `WebSocket` or `sendBeacon` calls, and no third-party script, font, image or analytics URL.
- **No AI service or API is called.** Chat answers are scripted from the learner's picks plus bundled fictional documents. The tiny model in Steps 1–2 trains in the browser on a bundled fictional corpus.
- No camera, microphone or file-picker access (`getUserMedia` and file inputs are not used). The "screenshot" and "voice" demos use built-in samples.
- One optional outbound link: the "source code" link to github.com opens only if a user clicks it.

## Storage
- Progress and sprint picks are stored only in the browser's `localStorage` (key `ryoba.v2`). No cookies are set (`document.cookie` is empty in tests).
- **Clear my data** (menu, welcome page and security panel) deletes the stored keys.
- The spec-card download is a local file created in the browser (Blob). Nothing is uploaded.
- Users are asked not to type real company or personal data into the bot-name or chat fields. Anything typed stays on the device.

## Content-Security-Policy
Set via a `<meta http-equiv>` tag in `index.html`. GitHub Pages can't send custom headers, so the policy isn't in the HTTP response.
```
default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'
```
`connect-src 'none'` blocks script-initiated network connections. `script-src 'self'` allows only the site's own scripts (no inline or third-party scripts). `form-action 'none'` blocks form submissions. Inline styles are allowed.

## Third-party code
- No JavaScript libraries or frameworks: all code is first-party plain JavaScript and is publicly reviewable at https://github.com/venky3007/build-your-own-gpt
- Fonts (Inter, Space Grotesk, JetBrains Mono) are bundled locally under the SIL Open Font License 1.1 (`assets/fonts/LICENSE-OFL.txt`).

## What the automated tests verify
Headless Chrome (Playwright) suites (`tools/test-site.mjs`, `tools/test-sprint.mjs`) run against both a local copy and the live site. They check:
- every request goes to the site's own origin (**0 external requests**)
- 0 JavaScript errors
- `document.cookie` is empty
- the security panel quotes the CSP
- "Clear my data" empties storage
- all simulated chat behaviours

## Known limitations
- Hosted from a **public repository on a personal GitHub account** (venky3007), not a corporate account. Changes depend on that account owner.
- GitHub Pages, as the host, may log visitor IP addresses and request data under GitHub's own privacy policy. That is outside this site's control.
- No SSO or access control: anyone with the URL can view it.
- The CSP is a meta tag, not an HTTP header. It is honoured by modern browsers, but it can't be enforced at the server.
- Not penetration-tested or certified. This summary is a factual description, not an assurance.

## Recommended options
- If preferred, host the same static folder on the company intranet or an internal static host (no build step; any web server works). Set the CSP above as a real HTTP header and add SSO there.
- Optionally fork the repository into a company-controlled GitHub organisation.
