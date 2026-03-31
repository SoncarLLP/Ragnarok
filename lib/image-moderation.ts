// lib/image-moderation.ts
// Server-side image safety detection using NsfwJS.
// Runs entirely locally — no external API keys required.
// Falls back gracefully if the model cannot be loaded.

export type ImageModerationResult = {
  safe: boolean;
  reason?: string;
  scores?: Record<string, number>;
};

// Thresholds for rejection
const THRESHOLDS = {
  Porn:      0.60,  // explicit content
  Sexy:      0.85,  // highly suggestive
  Hentai:    0.60,  // animated explicit
  Violence:  0.75,  // violent content (not in standard nsfwjs but kept for future)
};

let modelLoaded = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let nsfwModel: any = null;

async function loadModel() {
  if (modelLoaded) return nsfwModel;
  try {
    // Dynamic import to avoid issues at build time
    const tf = await import("@tensorflow/tfjs");
    const nsfw = await import("nsfwjs");
    await tf.ready();
    nsfwModel = await nsfw.load();
    modelLoaded = true;
    return nsfwModel;
  } catch (err) {
    console.warn("[image-moderation] Could not load NsfwJS model:", err);
    return null;
  }
}

/**
 * Checks an image buffer or URL for unsafe content.
 * Returns safe=true if the model is unavailable (fail-open for UX).
 * Logs a warning server-side when the model is missing.
 */
export async function checkImageSafety(
  imageInput: Buffer | string
): Promise<ImageModerationResult> {
  try {
    const model = await loadModel();
    if (!model) {
      console.warn("[image-moderation] Model unavailable — skipping check");
      return { safe: true };
    }

    // NsfwJS needs an HTMLImageElement on client, but on Node we need to use
    // the tfjs tensor approach via jimp or canvas. Use the URL variant if a URL
    // is provided; for buffers we need jimp to decode.
    const jimp = await import("jimp");
    let img: Awaited<ReturnType<typeof jimp.Jimp.read>>;

    if (typeof imageInput === "string") {
      img = await jimp.Jimp.read(imageInput);
    } else {
      img = await jimp.Jimp.read(imageInput);
    }

    // Resize to 224x224 for the model
    img.resize({ w: 224, h: 224 });

    // Get raw pixel data as Uint8Array
    const pixels = new Uint8Array(img.bitmap.data);
    // Remove alpha channel (RGBA → RGB)
    const rgb = new Uint8Array((pixels.length / 4) * 3);
    for (let i = 0, j = 0; i < pixels.length; i += 4, j += 3) {
      rgb[j]     = pixels[i];
      rgb[j + 1] = pixels[i + 1];
      rgb[j + 2] = pixels[i + 2];
    }

    const tf = await import("@tensorflow/tfjs");
    const tensor = tf.tensor3d(rgb, [224, 224, 3]);
    const predictions = await model.classify(tensor);
    tensor.dispose();

    const scores: Record<string, number> = {};
    for (const p of predictions) {
      scores[p.className] = p.probability;
    }

    // Check against thresholds
    for (const [category, threshold] of Object.entries(THRESHOLDS)) {
      if ((scores[category] ?? 0) >= threshold) {
        return {
          safe: false,
          reason: `Image contains potentially ${category.toLowerCase()} content`,
          scores,
        };
      }
    }

    return { safe: true, scores };
  } catch (err) {
    console.warn("[image-moderation] Error during image check:", err);
    // Fail-open: if anything goes wrong, allow the upload
    return { safe: true };
  }
}
