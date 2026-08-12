import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const appDist = fileURLToPath(new URL("../dist/", import.meta.url));
rmSync(appDist, { recursive: true, force: true });

