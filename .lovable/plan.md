

## Why Google says "not indexed" — and what to fix

### Diagnosis (what's happening)

I fetched `https://www.camerastream.live/` directly and the raw HTML body is essentially empty — just `<div id="root"></div>`. All page content (headlines, paragraphs, FAQ, links) is rendered by React in the browser. Robots.txt and sitemap are fine; meta tags exist; there is no `noindex` on the live domain.

So the problem is not a block — it's **crawl quality + site authority**:

1. **Client-side rendering (CSR)**. Googlebot must run JS to see content. It usually does, but for new low-authority sites Google often defers or skips JS rendering — the page enters "Crawled – currently not indexed" or "Discovered – currently not indexed".
2. **New domain, zero backlinks, no crawl history**. Indexing for fresh domains can take 2–8+ weeks even when everything is correct.
3. **Thin static HTML signal**. Without any server-rendered text, Google has nothing to evaluate on first pass.
4. **`SEOHead` runs client-side**. Page-specific titles/descriptions on `/blog`, `/documentation`, etc. only exist after JS runs. The static `index.html` head is the same for every route.
5. **Duplicate canonical risk**. Every route currently inherits `index.html`'s canonical = `/`, which can suppress indexing of `/blog`, `/documentation`, etc.

### Fix plan (priority order)

**1. Add static prerendered HTML for key routes (biggest win)**
   - Use `vite-plugin-prerender` or `react-snap` to prerender at build time:
     - `/`, `/documentation`, `/blog`, `/blog/free-home-security-camera-setup`, `/blog/privacy-first-camera-monitoring`, `/blog/webcam-vs-ip-camera`, `/contact`, `/privacy`, `/terms`
   - Result: Googlebot sees full HTML on first crawl, no JS needed. This is the single most impactful change.

**2. Fix per-route canonical & meta in static HTML**
   - Once prerendered, each route gets its own `<title>`, `<meta description>`, and `<link rel="canonical">` baked in.
   - Remove the global canonical from `index.html` (or keep only as a fallback overridden by prerender).

**3. Submit URLs manually in Google Search Console**
   - In GSC → URL Inspection → enter each URL → "Request Indexing". Do this for the 8 sitemap URLs.
   - Resubmit `sitemap.xml` in GSC → Sitemaps after prerender deploy.

**4. Validate render with Google's tools**
   - Use GSC → URL Inspection → "Test Live URL" → "View Tested Page" → confirm rendered HTML contains real content.
   - Use [Rich Results Test](https://search.google.com/test/rich-results) on the homepage and a blog post.

**5. Build minimal authority signals**
   - Add the site to: Product Hunt, GitHub repo README (if open source), a few relevant directories (AlternativeTo, SaaSHub).
   - Even 2–3 backlinks dramatically speed up indexing for new domains.

**6. Minor cleanups**
   - `robots.txt` has `Disallow: /dashboard` but the dashboard route is actually `/` (Index page) for logged-in users — verify no wanted page is accidentally blocked.
   - Confirm www → root (or root → www) 301 redirect is in place so Google doesn't see two versions.

### Out of scope (skip unless asked)

- Switching the whole stack to Next.js/SSR. Prerendering covers 95% of the SEO benefit without that rewrite.
- Paid SEO tools or backlink campaigns.

### Realistic timeline

After prerendering + GSC resubmission: **3–14 days** for first pages to index. Full indexing of all routes: **2–6 weeks**. Nothing makes Google index a brand-new domain instantly.

### What I'll do when you approve

1. Install and configure a Vite prerender plugin.
2. Add per-route SEO data so prerendered HTML has correct titles/descriptions/canonicals.
3. Verify by fetching the deployed URL and confirming real text appears in the raw HTML.
4. Give you the exact list of GSC actions to take after deploy.

