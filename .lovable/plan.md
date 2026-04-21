

## Remove "Monitor up to 16 cameras" from SEO descriptions

Strip the "Monitor up to 16 cameras" / "up to 16 cameras" phrasing from all SEO-relevant meta descriptions and structured data so search engines see a tighter, benefit-focused description.

### Files to update

1. **`index.html`**
   - `<meta name="description">` — remove "Monitor up to 16 cameras from any device."
   - `<meta property="og:description">` — remove "Monitor up to 16 cameras"
   - `<meta name="twitter:description">` — already clean, leave as-is
   - `<meta name="keywords">` — remove `multi-camera dashboard` only if it reads as "16 cameras"; keep otherwise
   - JSON-LD `SoftwareApplication.featureList` — keep "Multi-Camera Support" (no number)

2. **`src/components/SEOHead.tsx`**
   - `defaultJsonLd.featureList` — change `"Multi-camera support (up to 16 cameras)"` → `"Multi-camera support"`
   - Default `description` prop — already clean, leave as-is

3. **`public/sitemap.xml`** — bump `lastmod` to today so Google re-crawls.

### New copy

- **Meta description**: "Free, privacy-focused security camera monitoring with real-time motion detection, instant email alerts, and local storage. No subscription fees."
- **OG description**: "Free, privacy-focused security camera monitoring. Real-time motion detection, instant alerts, local storage — no subscription fees."

### Out of scope

- Landing page UI copy and Documentation/Blog content (those are user-facing product claims, not SEO meta). Tell me if you'd like those scrubbed too.
- The "16 cameras/user" core memory rule stays — it's still the enforced product limit, just not advertised in meta tags.

