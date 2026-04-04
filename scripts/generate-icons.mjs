/**
 * Generates all PWA icon sizes from the Ragnarök logo.
 * Run with: node scripts/generate-icons.mjs
 */
import { Jimp } from "jimp";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SOURCE = join(root, "public", "soncar-logo-ragnarok.png");
const OUT_DIR = join(root, "public", "icons");

async function main() {
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  const src = await Jimp.read(SOURCE);

  for (const size of SIZES) {
    const img = src.clone().resize({ w: size, h: size });
    await img.write(join(OUT_DIR, `icon-${size}x${size}.png`));
    console.log(`✓ icon-${size}x${size}.png`);
  }

  // Also write a 180x180 apple-touch-icon
  const apple = src.clone().resize({ w: 180, h: 180 });
  await apple.write(join(root, "public", "icons", "apple-touch-icon.png"));
  console.log("✓ apple-touch-icon.png");

  // 32x32 and 16x16 favicons
  for (const size of [16, 32]) {
    const fav = src.clone().resize({ w: size, h: size });
    await fav.write(join(OUT_DIR, `favicon-${size}x${size}.png`));
    console.log(`✓ favicon-${size}x${size}.png`);
  }

  console.log("\nAll icons generated in public/icons/");
}

main().catch((err) => { console.error(err); process.exit(1); });
