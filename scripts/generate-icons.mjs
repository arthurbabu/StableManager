import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUT_DIR = fileURLToPath(new URL("../public/icons/", import.meta.url));
mkdirSync(OUT_DIR, { recursive: true });

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#065f46"/>
  <path d="M256 120
           a120 120 0 0 0 -120 120
           v72
           a24 24 0 0 0 48 0
           v-72
           a72 72 0 0 1 144 0
           v72
           a24 24 0 0 0 48 0
           v-72
           a120 120 0 0 0 -120 -120
           z"
        fill="none" stroke="#ffffff" stroke-width="34" stroke-linecap="round"/>
</svg>
`;

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(OUT_DIR + name);
  console.log(`Generated ${name}`);
}
