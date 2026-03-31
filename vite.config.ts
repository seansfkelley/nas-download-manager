import { defineConfig, transformWithOxc, type Plugin } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

/** Strip TypeScript from .svelte.ts files so compileModule receives plain JS */
function svelteModuleTs(): Plugin {
  return {
    name: "svelte-module-ts",
    enforce: "pre",
    async transform(code, id) {
      if (/\.svelte\.[cm]?ts$/.test(id)) {
        return transformWithOxc(code, id);
      }
    },
  };
}

export default defineConfig({
  plugins: [svelteModuleTs(), svelte()],
  build: {
    target: ["chrome146", "firefox148"],
    emptyOutDir: false,
    modulePreload: false,
  },
});
