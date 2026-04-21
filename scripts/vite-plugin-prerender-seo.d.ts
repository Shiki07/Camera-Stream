declare module "./scripts/vite-plugin-prerender-seo.mjs" {
  import type { Plugin } from "vite";
  const plugin: () => Plugin;
  export default plugin;
}
