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
  body?: string;
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
    ogUrl: `<meta property="og:url" content="${canonical}" />`,
    ogTitle: `<meta property="og:title" content="${title}" />`,
    ogDesc: `<meta property="og:description" content="${desc}" />`,
    twUrl: `<meta name="twitter:url" content="${canonical}" />`,
    twTitle: `<meta name="twitter:title" content="${title}" />`,
    twDesc: `<meta name="twitter:description" content="${desc}" />`,
  };
}

function injectSeoIntoHtml(baseHtml: string, route: Route): string {
  const tags = buildHead(route);
  let html = baseHtml;

  html = html.replace(/<title>[\s\S]*?<\/title>/, tags.title);
  html = html.replace(/<meta\s+name="description"[^>]*>/i, tags.description);
  html = html.replace(/<meta\s+name="keywords"[^>]*>/i, tags.keywords);
  html = html.replace(/<link\s+rel="canonical"[^>]*>/i, tags.canonical);
  html = html.replace(/<meta\s+property="og:url"[^>]*>/i, tags.ogUrl);
  html = html.replace(/<meta\s+property="og:title"[^>]*>/i, tags.ogTitle);
  html = html.replace(/<meta\s+property="og:description"[^>]*>/i, tags.ogDesc);
  html = html.replace(/<meta\s+name="twitter:url"[^>]*>/i, tags.twUrl);
  html = html.replace(/<meta\s+name="twitter:title"[^>]*>/i, tags.twTitle);
  html = html.replace(/<meta\s+name="twitter:description"[^>]*>/i, tags.twDesc);

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
