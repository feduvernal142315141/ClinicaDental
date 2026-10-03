import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Resolves the tsconfig `paths` so tests import modules exactly like the app.
 * Exact aliases (e.g. "@/components/ui/badge") are listed before the wildcard ones
 * so the most specific mapping wins.
 */
function aliasesFromTsconfig() {
  const tsconfig = JSON.parse(readFileSync(path.resolve(__dirname, "tsconfig.json"), "utf8"));
  const paths: Record<string, string[]> = tsconfig.compilerOptions?.paths ?? {};
  const exact: { find: RegExp; replacement: string }[] = [];
  const wildcard: { find: RegExp; replacement: string }[] = [];

  for (const [key, [target]] of Object.entries(paths)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (key.endsWith("/*")) {
      wildcard.push({
        find: new RegExp(`^${escaped.slice(0, -3)}/(.*)$`),
        replacement: path.resolve(__dirname, target.slice(0, -2)) + "/$1",
      });
    } else {
      exact.push({ find: new RegExp(`^${escaped}$`), replacement: path.resolve(__dirname, target) });
    }
  }
  // Longer prefixes first: "@/components/settings/*" must beat "@/*".
  wildcard.sort((a, b) => b.find.source.length - a.find.source.length);
  return [...exact, ...wildcard];
}

export default defineConfig({
  resolve: {
    alias: [
      // Algunos @radix-ui/* traen anidada @radix-ui/primitive 1.1.1, que no declara el subpath
      // "./is-development" que importan sus hermanos; Node no lo resuelve (el bundler de Next sí).
      // Se apunta a la copia de nivel superior (1.1.7), que sí lo exporta.
      {
        find: /^@radix-ui\/primitive\/is-development$/,
        replacement: path.resolve(__dirname, "node_modules/@radix-ui/primitive/dist/internal/is-development.true.mjs"),
      },
      ...aliasesFromTsconfig(),
    ],
  },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", ".next-build/**"],
    // Los @radix-ui/* pasan por el resolver de Vite para que aplique el alias de "is-development".
    server: { deps: { inline: [/@radix-ui\//] } },
  },
});
