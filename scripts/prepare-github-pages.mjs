import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const lab = fileURLToPath(new URL("../dist/lab/", import.meta.url));

mkdirSync(lab, { recursive: true });
copyFileSync(`${dist}index.html`, `${lab}index.html`);
writeFileSync(`${dist}.nojekyll`, "", "utf8");
