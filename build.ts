import { build, type InlineConfig } from "vite";
import { spawn } from "child_process";

const watch = process.argv.includes("--watch");

const shared: Partial<InlineConfig> = {
  build: {
    minify: !watch,
    sourcemap: watch ? "inline" : false,
  },
  logLevel: "info",
};

function uiBuild(entry: string, outDir: string): InlineConfig {
  return {
    ...shared,
    build: {
      ...shared.build,
      outDir,
      rolldownOptions: {
        input: entry,
        output: {
          entryFileNames: "index.js",
          assetFileNames: "[name][extname]",
        },
      },
      cssCodeSplit: false,
    },
  };
}

function pureTsBuild(entry: string, outDir: string, name: string): InlineConfig {
  return {
    ...shared,
    plugins: [],
    build: {
      ...shared.build,
      lib: {
        entry,
        formats: ["iife"],
        name,
        fileName: () => "index.js",
      },
      outDir,
    },
  };
}

const configs: InlineConfig[] = [
  uiBuild("src/popup/index.ts", "dist/popup"),
  uiBuild("src/settings/index.ts", "dist/settings"),
  pureTsBuild("src/background/index.ts", "dist/background", "background"),
  pureTsBuild("src/content/index.ts", "dist/content", "content"),
];

async function run() {
  if (watch) {
    const svelteCheck = spawn("pnpm", ["svelte-check", "--watch"], {
      stdio: "inherit",
    });
    process.on("exit", () => svelteCheck.kill());

    for (const config of configs) {
      await build({ ...config, build: { ...config.build, watch: {} } });
    }
  } else {
    for (const config of configs) {
      await build(config);
    }
  }
}

run();
