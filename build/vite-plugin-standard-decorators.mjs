/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Lowers standard (TC39 Stage 3) decorators for Vite and Vitest.
//
// MobX 7 supports only standard decorators, so the sources are compiled
// without `experimentalDecorators`. Oxc, which transpiles TypeScript for
// Vite 8 and Vitest 4, lowers legacy decorators only: it passes standard ones
// through untouched, and neither Node nor Electron can run them yet. This
// plugin runs before Oxc and hands every TypeScript module that has a
// decorator to esbuild, which lowers the decorators (and the `accessor` fields
// they sit on) and nothing else. Oxc then processes the result like any other
// module, JSX included.
//
// esbuild spawns its service binary over piped stdio. That is blocked in the
// DSH sandbox (spawn EPERM), so the plugin detects it once and falls back to
// Babel with `@babel/plugin-proposal-decorators` (version "2023-11"), which
// lowers the same syntax in-process.

import { transformSync as babelTransformSync } from "@babel/core";
import proposalDecorators from "@babel/plugin-proposal-decorators";
import presetTypeScript from "@babel/preset-typescript";
import { transform as esbuildTransform } from "esbuild";

const typeScriptModule = /\.[cm]?tsx?$/;
const decoratorAtLineStart = /^\s*@[A-Za-z_$]/m;

/** @type {"esbuild" | "babel" | undefined} */
let loweringEngine;

/** @returns {Promise<"esbuild" | "babel">} */
async function getLoweringEngine() {
  if (loweringEngine === undefined) {
    try {
      await esbuildTransform("class Probe {}", { loader: "ts", target: "esnext" });
      loweringEngine = "esbuild";
    } catch {
      loweringEngine = "babel";
    }
  }
  return loweringEngine;
}

/** @returns {import("vite").Plugin} */
export function standardDecorators() {
  return {
    name: "freelens:standard-decorators",
    enforce: "pre",
    async transform(code, id) {
      const path = id.split("?", 1)[0];

      if (!typeScriptModule.test(path) || path.includes("/node_modules/") || !decoratorAtLineStart.test(code)) {
        return null;
      }

      if ((await getLoweringEngine()) === "esbuild") {
        const result = await esbuildTransform(code, {
          loader: path.endsWith("x") ? "tsx" : "ts",
          jsx: "preserve",
          target: "esnext",
          supported: { decorators: false },
          sourcefile: path,
          sourcemap: "external",
          tsconfigRaw: {
            compilerOptions: {
              experimentalDecorators: false,
              useDefineForClassFields: true,
              verbatimModuleSyntax: false,
            },
          },
        });
        return { code: result.code, map: result.map };
      }

      // Babel 8's preset-typescript detects JSX from the file extension
      // (`filename` above) and always enables declare-fields semantics. The
      // option tuples are cast because Babel 8's config types reject the
      // direct module references.
      /** @type {any} */
      const tsPreset = [presetTypeScript];
      /** @type {any} */
      const decorators = [proposalDecorators, { version: "2023-11" }];
      const result = babelTransformSync(code, {
        filename: path,
        sourceMaps: true,
        sourceFileName: path,
        presets: [tsPreset],
        plugins: [decorators],
      });
      if (result === null || result.code == null) {
        throw new Error(`Babel failed to lower decorators in ${path}`);
      }
      return { code: result.code, map: /** @type {any} */ (result.map ?? undefined) };
    },
  };
}
