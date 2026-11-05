import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

const OUT_DIR = "/home/z/my-project/public/uploads/demo";

type Job = { file: string; prompt: string; size: string };

const STYLE =
  "premium dark moody studio lighting, charcoal black background, subtle chartreuse lime green accent lighting, high-end editorial design aesthetic, photorealistic, professional portfolio photography, dramatic shadows, high quality, detailed";

const jobs: Job[] = [
  {
    file: "portrait.png",
    prompt:
      "professional portrait photograph of a confident male graphic designer in his mid 30s, short dark hair, black turtleneck, sitting in a dark design studio with soft rim lighting, looking thoughtfully off camera, cinematic chiaroscuro, premium editorial magazine photography, dark charcoal background, high quality, detailed",
    size: "864x1152",
  },
  {
    file: "project-lumen-brand.png",
    prompt:
      "luxury coffee brand identity mockup flat lay, matte black coffee bags with elegant serif logo, business cards and stationery on dark textured stone surface, " +
      STYLE,
    size: "1344x768",
  },
  {
    file: "project-halcyon-logo.png",
    prompt:
      "minimal geometric monogram logo presentation, embossed silver foil logo on black paper, logo construction grid with golden ratio lines, sophisticated brand mark design showcase, " +
      STYLE,
    size: "1344x768",
  },
  {
    file: "project-pulse-social.png",
    prompt:
      "smartphone mockup displaying bold social media campaign graphics, dynamic abstract shapes in lime green and black, floating instagram post layouts around the phone, modern advertising design showcase, " +
      STYLE,
    size: "1344x768",
  },
  {
    file: "project-terra-packaging.png",
    prompt:
      "premium skincare packaging design mockup, amber glass bottles with minimal black labels arranged on dark slate, soft dramatic studio light, luxury cosmetic packaging photography, " +
      STYLE,
    size: "1344x768",
  },
  {
    file: "project-noir-poster.png",
    prompt:
      "series of swiss style typographic posters pinned on dark concrete gallery wall, oversized experimental typography, black white and acid lime green, film festival poster design, dramatic spotlight, " +
      STYLE,
    size: "1344x768",
  },
  {
    file: "project-fernway-ui.png",
    prompt:
      "modern travel app ui design mockup on floating smartphone screens, dark theme interface with lime green accents, clean typography and map cards, futuristic fintech style product design showcase, " +
      STYLE,
    size: "1344x768",
  },
  {
    file: "project-atlas-editorial.png",
    prompt:
      "open architecture magazine spread on dark table, striking editorial layout with huge serif headline and grid of black and white photography, print design mockup, moody studio lighting, " +
      STYLE,
    size: "1344x768",
  },
  {
    file: "project-nebula-3d.png",
    prompt:
      "abstract 3d chrome liquid sculpture artwork render, floating metallic ribbon shapes with glass elements, dark void background with subtle lime green reflections, octane render, " +
      STYLE,
    size: "1344x768",
  },
  {
    file: "gallery-brand-stationery.png",
    prompt:
      "close up of letterpress business cards and engraved brass door sign for luxury cafe brand, dark moody branding mockup photography, " +
      STYLE,
    size: "1344x768",
  },
  {
    file: "gallery-packaging-shots.png",
    prompt:
      "unboxing scene of premium skincare gift set, black rigid box with embossed pattern, tissue paper, amber bottles, luxury packaging photography, " +
      STYLE,
    size: "1344x768",
  },
  {
    file: "gallery-poster-detail.png",
    prompt:
      "extreme close up macro of experimental typographic poster print details, ink texture on black paper, acid lime green ink, abstract letterforms, dark photography, " +
      STYLE,
    size: "1344x768",
  },
  {
    file: "og-image.png",
    prompt:
      "premium dark designer portfolio hero artwork, floating abstract chrome sculpture on black background with subtle lime green accent glow, elegant minimal composition, " +
      STYLE,
    size: "1440x704",
  },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const zai = await ZAI.create();
  const failed: string[] = [];

  for (const job of jobs) {
    const outPath = path.join(OUT_DIR, job.file);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 20000) {
      console.log(`skip (exists): ${job.file}`);
      continue;
    }
    let done = false;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      try {
        const res = await zai.images.generations.create({
          prompt: job.prompt,
          size: job.size,
        });
        const b64 = res.data?.[0]?.base64;
        if (!b64) throw new Error("empty response");
        fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
        console.log(`ok: ${job.file} (${job.size})`);
        done = true;
      } catch (err) {
        console.error(`attempt ${attempt} failed for ${job.file}: ${(err as Error).message}`);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
    if (!done) failed.push(job.file);
  }

  console.log(failed.length ? `FAILED: ${failed.join(", ")}` : "ALL IMAGES DONE");
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});
