import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const geometryRoot = fileURLToPath(new URL("../packages/geometry/src/", import.meta.url));
const renderRoot = fileURLToPath(new URL("../packages/render/src/", import.meta.url));
const forbidden = [
  { label: "Three.js import", pattern: /from\s+["']three(?:\/[^"']*)?["']/u },
  { label: "GSAP import", pattern: /from\s+["']gsap(?:\/[^"']*)?["']/u },
  { label: "browser global", pattern: /\b(?:document|window)\s*\./u },
  { label: "Three.js namespace", pattern: /\bTHREE\s*\./u },
  { label: "GPU renderer", pattern: /\b(?:WebGPU|WebGL)(?:Renderer|RenderingContext)\b/u },
];

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return extname(entry.name) === ".ts" ? [path] : [];
  });
}

const geometryFiles = sourceFiles(geometryRoot);
const renderFiles = sourceFiles(renderRoot);
const geometryFailures = geometryFiles.flatMap((file) => {
  const source = readFileSync(file, "utf8");
  return forbidden
    .filter(({ pattern }) => pattern.test(source))
    .map(({ label }) => `${label}: ${file}`);
});

const renderFailures = renderFiles.flatMap((file) => {
  const source = readFileSync(file, "utf8");
  return [
    { label: "scene-package import", pattern: /from\s+["']@order-in-space\/scenes(?:\/[^"']*)?["']/u },
    { label: "scroll choreography import", pattern: /from\s+["'](?:gsap|@studio-freight\/lenis|lenis)(?:\/[^"']*)?["']/u },
    { label: "scroll position access", pattern: /\b(?:scrollY|scrollX|scrollTo|ScrollTrigger)\b/u },
  ]
    .filter(({ pattern }) => pattern.test(source))
    .map(({ label }) => `${label}: ${file}`);
});

const failures = [...geometryFailures, ...renderFailures];

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Boundary check passed for ${geometryFiles.length} geometry and ${renderFiles.length} render source files.`);
}
