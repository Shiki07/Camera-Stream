// Lightweight Vite plugin that emits one static HTML file per route.
// No headless browser required — works on Lovable's build infrastructure.
//
// Each emitted HTML file is a copy of dist/index.html with route-specific
// <title>, <meta description/keywords>, canonical, OG/Twitter tags, and a
// hidden SEO content block crawlers can read without executing JavaScript.
// React then hydrates the client-side app on top, replacing the visible UI.

import type { Plugin } from "vite";
import { routes, SITE_URL } from "./seo-routes";

interface Route {
  path: string;
  title: string;
  description: string;
  keywords?: string;
  h1?: string;
  ogType?: string;
  noindex?: boolean;
  body?: string;
  /** ISO publication date for article Open Graph tags. */
  date?: string;
}

const escapeHtml = (s: string): string =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function buildHead(route: Route) {
  const canonical = SITE_URL + (route.path === "/" ? "/" : route.path);
  const title = escapeHtml(route.title);
  const desc = escapeHtml(route.description);
  const kw = escapeHtml(route.keywords || "");

  return {
    title: `<title>${title}</title>`,
    description: `<meta name="description" content="${desc}" />`,
    keywords: `<meta name="keywords" content="${kw}" />`,
    canonical: `<link rel="canonical" href="${canonical}" />`,
    robots: `<meta name="robots" content="${
      route.noindex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    }" />`,
    ogType: `<meta property="og:type" content="${escapeHtml(
      route.ogType || (route.path.startsWith("/blog/") ? "article" : "website")
    )}" />`,
    ogUrl: `<meta property="og:url" content="${canonical}" />`,
    ogTitle: `<meta property="og:title" content="${title}" />`,
    ogDesc: `<meta property="og:description" content="${desc}" />`,
    twUrl: `<meta name="twitter:url" content="${canonical}" />`,
    twTitle: `<meta name="twitter:title" content="${title}" />`,
    twDesc: `<meta name="twitter:description" content="${desc}" />`,
    ogImageAlt: `<meta property="og:image:alt" content="${title}" />`,
    twImageAlt: `<meta name="twitter:image:alt" content="${title}" />`,
  };
}

function buildJsonLd(route: Route): string {
  const canonical = SITE_URL + (route.path === "/" ? "/" : route.path);
  const blocks: object[] = [];

  if (route.path === "/") {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Camera Stream",
      description:
        "Privacy-focused security camera monitoring system with motion detection, real-time alerts, and local storage.",
      url: canonical,
      applicationCategory: "SecurityApplication",
      operatingSystem: "Web Browser",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    });
  } else {
    // Breadcrumb reflecting the route's real hierarchy, e.g.
    // Home > Blog > <post> for /blog/<slug>, Home > Documentation otherwise.
    const segments = route.path.replace(/^\//, "").split("/");
    const items: object[] = [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL + "/" },
    ];
    let acc = "";
    segments.forEach((seg, i) => {
      acc += `/${seg}`;
      const isLast = i === segments.length - 1;
      const name = isLast
        ? route.h1 || route.title
        : seg.charAt(0).toUpperCase() + seg.slice(1);
      items.push({
        "@type": "ListItem",
        position: i + 2,
        name,
        item: SITE_URL + acc,
      });
    });
    blocks.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items,
    });
  }

  return blocks
    .map(
      (b) =>
        `<script type="application/ld+json">${JSON.stringify(b).replace(
          /</g,
          "\\u003c"
        )}</script>`
    )
    .join("\n    ");
}

function upsert(html: string, pattern: RegExp, tag: string): string {
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace(/<\/head>/i, `  ${tag}\n  </head>`);
}

function injectSeoIntoHtml(baseHtml: string, route: Route): string {
  const tags = buildHead(route);
  let html = baseHtml;

  html = html.replace(/<title>[\s\S]*?<\/title>/, tags.title);
  html = upsert(html, /<meta\s+name="description"[^>]*>/i, tags.description);
  html = upsert(html, /<meta\s+name="keywords"[^>]*>/i, tags.keywords);
  html = upsert(html, /<link\s+rel="canonical"[^>]*>/i, tags.canonical);
  html = upsert(html, /<meta\s+name="robots"[^>]*>/i, tags.robots);
  html = upsert(html, /<meta\s+property="og:type"[^>]*>/i, tags.ogType);
  html = upsert(html, /<meta\s+property="og:url"[^>]*>/i, tags.ogUrl);
  html = upsert(html, /<meta\s+property="og:title"[^>]*>/i, tags.ogTitle);
  html = upsert(html, /<meta\s+property="og:description"[^>]*>/i, tags.ogDesc);
  html = upsert(html, /<meta\s+name="twitter:url"[^>]*>/i, tags.twUrl);
  html = upsert(html, /<meta\s+name="twitter:title"[^>]*>/i, tags.twTitle);
  html = upsert(html, /<meta\s+name="twitter:description"[^>]*>/i, tags.twDesc);
  html = upsert(html, /<meta\s+property="og:image:alt"[^>]*>/i, tags.ogImageAlt);
  html = upsert(html, /<meta\s+name="twitter:image:alt"[^>]*>/i, tags.twImageAlt);


  // Route-specific structured data (app schema on home, breadcrumbs elsewhere).
  html = html.replace(/<\/head>/i, `  ${buildJsonLd(route)}\n  </head>`);

  // Visually-hidden SEO content for crawlers; React replaces #root on hydrate.
  const seoBlock = `
    <div id="seo-prerender" style="position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;" aria-hidden="true">
      <h1>${escapeHtml(route.h1 || route.title)}</h1>
      ${route.body || ""}
    </div>
  `;
  html = html.replace(
    /<div id="root"><\/div>/,
    `<div id="root"></div>${seoBlock}`
  );

  return html;
}

export default function prerenderSeoPlugin(): Plugin {
  return {
    name: "vite-plugin-prerender-seo",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const indexAsset = bundle["index.html"];
      if (!indexAsset || indexAsset.type !== "asset") {
        this.warn("[prerender-seo] index.html not found in bundle; skipping.");
        return;
      }
      const baseHtml = (indexAsset.source as string | Uint8Array).toString();

      const rootRoute = (routes as Route[]).find((r) => r.path === "/");
      if (rootRoute) {
        indexAsset.source = injectSeoIntoHtml(baseHtml, rootRoute);
      }

      for (const route of routes as Route[]) {
        if (route.path === "/") continue;
        const fileName = `${route.path.replace(/^\//, "")}/index.html`;
        this.emitFile({
          type: "asset",
          fileName,
          source: injectSeoIntoHtml(baseHtml, route),
        });
      }
    },
  };
}
