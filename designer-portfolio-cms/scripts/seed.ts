/**
 * Demo content seeder — clearly-marked sample data for initial development.
 * Run: bun scripts/seed.ts          (skips if already seeded)
 *      FORCE=1 bun scripts/seed.ts  (wipe content tables & reseed)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const IMG = "/uploads/demo";

const j = (arr: unknown[]) => JSON.stringify(arr);

async function main() {
  const existingProfile = await db.profile.findFirst();
  const force = process.env.FORCE === "1";
  if (existingProfile && !force) {
    console.log("Already seeded — use FORCE=1 to reseed. Exiting.");
    return;
  }

  if (force) {
    await db.contactInquiry.deleteMany();
    await db.projectImage.deleteMany();
    await db.project.deleteMany();
    await db.projectCategory.deleteMany();
    await db.service.deleteMany();
    await db.skill.deleteMany();
    await db.experience.deleteMany();
    await db.education.deleteMany();
    await db.certification.deleteMany();
    await db.achievement.deleteMany();
    await db.testimonial.deleteMany();
    await db.socialLink.deleteMany();
    await db.mediaAsset.deleteMany();
    await db.profile.deleteMany();
    await db.websiteSetting.deleteMany();
  }

  /* ── Admin ─────────────────────────────────────────────── */
  const adminExists = await db.adminUser.findUnique({ where: { email: "admin@vale.studio" } });
  if (!adminExists) {
    await db.adminUser.create({
      data: {
        email: "admin@vale.studio",
        passwordHash: await bcrypt.hash("ValeStudio#2026", 12),
        name: "Studio Admin",
        role: "ADMIN",
      },
    });
    console.log("✓ Admin user (demo credentials — see README)");
  }

  /* ── Categories (12 from spec) ─────────────────────────── */
  const categoryNames = [
    "Brand Identity", "Logo Design", "Social Media Design", "Advertising Design",
    "UI/UX Design", "Packaging Design", "Print Design", "Poster Design",
    "Motion Graphics", "3D Artwork", "Illustration", "Editorial Design",
  ];
  const categories: Record<string, string> = {};
  for (let i = 0; i < categoryNames.length; i++) {
    const name = categoryNames[i];
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const cat = await db.projectCategory.upsert({
      where: { slug },
      update: {},
      create: { name, slug, order: i },
    });
    categories[name] = cat.id;
  }
  console.log("✓ 12 categories");

  /* ── Media assets (register demo images) ───────────────── */
  const demoFiles = [
    ["portrait.png", "profile", "Portrait of Adrian Vale in his Berlin studio"],
    ["project-lumen-brand.png", "projects", "LUMEN coffee brand identity flat lay"],
    ["project-halcyon-logo.png", "projects", "HALCYON monogram logo presentation"],
    ["project-pulse-social.png", "projects", "PULSE festival social media campaign"],
    ["project-terra-packaging.png", "projects", "TERRA botanicals packaging design"],
    ["project-noir-poster.png", "projects", "NOIR film festival poster series"],
    ["project-fernway-ui.png", "projects", "FERNWAY travel app UI design"],
    ["project-atlas-editorial.png", "projects", "ATLAS Quarterly editorial spread"],
    ["project-nebula-3d.png", "projects", "NEBULA 3D chrome sculpture artwork"],
    ["gallery-brand-stationery.png", "projects", "LUMEN letterpress stationery detail"],
    ["gallery-packaging-shots.png", "projects", "TERRA packaging unboxing scene"],
    ["gallery-poster-detail.png", "projects", "NOIR poster typographic detail"],
    ["og-image.png", "general", "Adrian Vale portfolio social sharing artwork"],
  ];
  for (const [filename, folder, alt] of demoFiles) {
    await db.mediaAsset.upsert({
      where: { id: `demo-${filename}` },
      update: { alt },
      create: {
        id: `demo-${filename}`,
        filename,
        originalName: filename,
        url: `${IMG}/${filename}`,
        mimeType: "image/png",
        size: 400_000,
        alt,
        folder,
      },
    });
  }
  console.log("✓ 13 media assets registered");

  /* ── Profile ───────────────────────────────────────────── */
  const profile = await db.profile.upsert({
    where: { id: "demo-profile" },
    update: {},
    create: {
      id: "demo-profile",
      name: "Adrian Vale",
      title: "Graphic Designer & Art Director",
      tagline: "Independent design practice for brands with something to say.",
      shortBio:
        "I help ambitious brands find their visual voice — and make it impossible to ignore.",
      bio: [
        "For the past nine years I've designed identities, packaging, editorial systems and campaigns for founders, cultural institutions and global brands — first inside studios in Berlin and Amsterdam, now as an independent practice.",
        "My work sits at the intersection of strategy and craft: every project starts with research and positioning, and ends with meticulous, production-ready design systems. I believe the best identities are simple truths, executed with uncommon discipline.",
        "When I'm not designing, I'm collecting mid-century Swiss posters, teaching typography workshops, and drinking far too much specialty coffee.",
      ].join("\n"),
      photoUrl: `${IMG}/portrait.png`,
      email: "hello@adrianvale.studio",
      phone: "+49 30 0000 0000",
      location: "Berlin, Germany",
      availabilityStatus: "AVAILABLE",
      availabilityNote: "Booking new projects for Q1 2027",
      yearsExperience: 9,
      clientCount: 64,
      projectCount: 128,
      awardsCount: 12,
      philosophyTitle: "CLARITY OVER DECORATION",
      philosophy:
        "Design is not decoration — it is the disciplined translation of a brand's truth into form. If a project needs more ornament to work, the idea isn't strong enough yet.",
      interests:
        "Swiss poster collecting, typography workshops, analog photography, and chasing the perfect espresso.",
      resumeUrl: "/uploads/cv/adrian-vale-cv.pdf",
    },
  });
  console.log("✓ Profile");

  /* ── Projects (8 case studies) ─────────────────────────── */
  type ProjectSeed = {
    title: string; slug: string; category: string; summary: string; description: string;
    client: string; date: string; tools: string[]; cover: string; thumb?: string;
    featured: boolean; order: number; accent: string;
    objectives: string; challenges: string; research: string; strategy: string; concept: string;
    palette: { name: string; hex: string }[]; typography: string[]; applications: string[]; outcome: string;
    gallery: { url: string; alt: string; caption: string }[];
  };

  const projects: ProjectSeed[] = [
    {
      title: "LUMEN Coffee Roasters",
      slug: "lumen-coffee-roasters",
      category: "Brand Identity",
      summary: "A full identity system for a specialty coffee roaster — quiet luxury, loud coffee.",
      description:
        "LUMEN came to us with exceptional coffee and a forgettable shelf presence. We rebuilt the brand from strategy up: positioning, naming refinement, a bespoke wordmark, packaging architecture and a launch campaign that took the roastery from local favorite to national wholesale accounts.\nThe identity leans on a restrained black-and-crema palette punctuated by a single electric lime — a deliberate tension between heritage roasting craft and the energy of third-wave coffee culture.",
      client: "LUMEN Kaffee GmbH",
      date: "2025-09-01",
      tools: ["Illustrator", "InDesign", "Photoshop", "Blender"],
      cover: `${IMG}/project-lumen-brand.png`,
      featured: true,
      order: 1,
      accent: "#C6FF00",
      objectives: "Reposition a beloved local roastery as a premium national brand without alienating its founding community; create shelf standout in a category saturated with kraft-paper minimalism.",
      challenges: "The specialty coffee market is visually homogeneous. The brand needed to feel premium yet approachable, work across 6 SKU flavor profiles, and translate from a 60g bag to a café façade without losing character.",
      research: "Two weeks of competitor shelf audits across 12 retailers, roastery interviews, and a survey of 240 specialty coffee drinkers on taste cue recognition. Key insight: warmth and provenance drive trust more than 'craft' clichés.",
      strategy: "Own the tension between ritual and energy. Position LUMEN as 'the bright hour' — the daily moment the brand celebrates. This gave us a conceptual spine for naming SKUs, art direction and tone of voice.",
      concept: "A custom grotesque wordmark with a single ligature cut inspired by steam curves, paired with a flexible label architecture where each origin gets its own accent field. Matte black bags, debossed marks, high-contrast type.",
      palette: [
        { name: "Roast Black", hex: "#141210" },
        { name: "Crema", hex: "#E8DCC8" },
        { name: "Lumen Lime", hex: "#C6FF00" },
        { name: "Paper", hex: "#F6F2EA" },
      ],
      typography: ["Söhne Breit (wordmark)", "GT Alpina (editorial)", "Söhne Mono (data)"],
      applications: ["Wordmark & monogram", "Packaging system (6 SKUs)", "Café signage & menus", "Wholesale catalog", "Launch social kit"],
      outcome: "Within six months of launch: 4 national wholesale accounts, +38% direct-to-consumer revenue, and a feature in a leading coffee design annual.",
      gallery: [
        { url: `${IMG}/gallery-brand-stationery.png`, alt: "LUMEN letterpress business cards and brass signage", caption: "Letterpress stationery & engraved signage" },
        { url: `${IMG}/project-lumen-brand.png`, alt: "LUMEN packaging family", caption: "The full packaging family" },
      ],
    },
    {
      title: "HALCYON Monogram System",
      slug: "halcyon-monogram-system",
      category: "Logo Design",
      summary: "A golden-ratio monogram and brandmark suite for a private investment firm.",
      description:
        "HALCYON needed a mark that communicated discretion, precision and permanence — the visual language of quiet capital. The monogram is constructed entirely from golden-ratio circles, giving it a geometry that holds up from a 12px favicon to a brass door plaque.\nDelivery included a 60-page brandmark guideline covering clearspace, misuses, co-branding lockups and animation principles.",
      client: "Halcyon Partners",
      date: "2025-04-15",
      tools: ["Illustrator", "Figma", "Cinema 4D"],
      cover: `${IMG}/project-halcyon-logo.png`,
      featured: true,
      order: 2,
      accent: "#C8C8C8",
      objectives: "Create a monogram system that feels institutional without being dated, and provide governance so the mark stays disciplined across future applications.",
      challenges: "Financial sector marks gravitate toward either sterile sameness or dated serif clichés. The client wanted 'timeless modernism' — a mark that would still feel right in 20 years.",
      research: "Studied 40 heritage financial marks (1800s–today) to identify the structural grammar of longevity: optical-center construction, moderate stroke contrast, and closed negative space.",
      strategy: "Build on construction rather than style. Every curve of the monogram is derived from golden-ratio arcs — a rationale that makes the design feel inevitable rather than fashionable.",
      concept: "An H·C ligature cut from a circle grid, with a single lime-accented digital variant for product surfaces and a full metallic suite for print and environmental use.",
      palette: [
        { name: "Graphite", hex: "#1C1C1C" },
        { name: "Steel", hex: "#8A8F98" },
        { name: "Signal Lime", hex: "#C6FF00" },
      ],
      typography: ["Founders Grotesk (primary)", "Tiempos Text (documents)"],
      applications: ["Primary monogram", "Brandmark suite (4 variants)", "Favicon & app icons", "60-page usage guidelines"],
      outcome: "The monogram now anchors stationery, the partner portal UI, office environmental graphics and pitch materials — with zero revision requests post-delivery.",
      gallery: [
        { url: `${IMG}/project-halcyon-logo.png`, alt: "HALCYON monogram construction grid", caption: "Golden-ratio construction grid" },
      ],
    },
    {
      title: "PULSE Festival Campaign",
      slug: "pulse-festival-campaign",
      category: "Social Media Design",
      summary: "A 90-asset motion-first social campaign for an electronic music festival.",
      description:
        "PULSE needed a social campaign that could keep pace with its lineup announcements — 90 assets in six weeks across Instagram, TikTok and YouTube, each with motion variants.\nWe built a component system: a typographic engine driven by the lineup data, so artist announcements generated themselves from templates. Design system first, assets second.",
      client: "PULSE Music Festival",
      date: "2025-02-20",
      tools: ["After Effects", "Figma", "Illustrator", "Premiere Pro"],
      cover: `${IMG}/project-pulse-social.png`,
      featured: true,
      order: 3,
      accent: "#C6FF00",
      objectives: "Maximize lineup-announcement reach and ticket-link CTR with a coherent but relentlessly varied feed presence.",
      challenges: "90 assets, six weeks, three platforms with different aspect ratios — without a system, this scope guarantees visual chaos. Every asset also had to survive being seen at 30% brightness on a phone.",
      research: "Analyzed the previous year's 200 posts: static typographic posts outperformed photo posts by 2.3× for announcements. Contrast and motion-in-first-frame were the strongest CTR predictors.",
      strategy: "Design a generative system, not assets. A typographic engine where lineup data flows into animated templates — variation by construction, consistency by design.",
      concept: "Oversized condensed numerals and artist names sliced by scan-line transitions, locked to a black/lime grid. Each artist 'earns' their own type treatment within system rules.",
      palette: [
        { name: "Void", hex: "#0A0A0A" },
        { name: "Pulse Lime", hex: "#C6FF00" },
        { name: "Fog", hex: "#B9BDC4" },
      ],
      typography: ["Druk Condensed (headlines)", "Space Grotesk (body)"],
      applications: ["90 social assets", "Template kit (Figma)", "Motion toolkit (AE)", "Story & countdown stencils"],
      outcome: "The announcement phase reached 4.2M organic impressions — 3.1× the previous year — and the template kit let the in-house team produce the remaining season independently.",
      gallery: [
        { url: `${IMG}/project-pulse-social.png`, alt: "PULSE campaign social assets on devices", caption: "The announcement family across formats" },
      ],
    },
    {
      title: "TERRA Botanicals",
      slug: "terra-botanicals",
      category: "Packaging Design",
      summary: "Packaging architecture for a premium skincare line rooted in Scandinavian apothecary tradition.",
      description:
        "TERRA formulates botanical skincare in small batches. The packaging system had to communicate clinical efficacy and apothecary warmth simultaneously — a balance most skincare brands pick one side of.\nWe designed a modular label architecture: a permanent structural band carries the brand, while a variable band carries each formula's botanical story, illustrated by hand-drawn engravings.",
      client: "TERRA Skincare AB",
      date: "2024-11-05",
      tools: ["Illustrator", "Photoshop", "InDesign"],
      cover: `${IMG}/project-terra-packaging.png`,
      featured: true,
      order: 4,
      accent: "#D9A05B",
      objectives: "Launch 9 SKUs into premium retail with a packaging system that scales to 20+ formulas without redesign.",
      challenges: "Regulatory text density (INCI lists, batch codes) threatened to overwhelm the calm, minimal front-of-pack. Amber glass photography was also essential but the client had no product imagery budget at design time.",
      research: "Retail audits at 8 premium stockists and consumer testing of 5 structural directions. Shoppers consistently read 'apothecary engraving' as craft, and 'clinical grid' as efficacy — the insight was to layer both.",
      strategy: "Structure communicates efficacy, surface communicates story. A strict typographic grid for mandatory information; an emotional engraved illustration layer for botanical provenance.",
      concept: "Deep-black labels on amber glass, an engraved botanical per formula, and a tactile unboxing ritual with debossed rigid boxes.",
      palette: [
        { name: "Amber", hex: "#8C5A2B" },
        { name: "Ink", hex: "#171512" },
        { name: "Botanical Cream", hex: "#F2EDE4" },
      ],
      typography: ["Canela (display)", "Founders Grotesk Mono (INCI data)"],
      applications: ["Label system (9 SKUs)", "Rigid box packaging", "Unboxing collateral", "Retail display units"],
      outcome: "Full sell-through of the launch production run in 11 weeks and placement in two premium retail chains; the system absorbed 6 new SKUs with zero structural changes.",
      gallery: [
        { url: `${IMG}/gallery-packaging-shots.png`, alt: "TERRA packaging unboxing scene", caption: "The unboxing ritual" },
        { url: `${IMG}/project-terra-packaging.png`, alt: "TERRA product family", caption: "Product family on slate" },
      ],
    },
    {
      title: "NOIR Film Festival",
      slug: "noir-film-festival",
      category: "Poster Design",
      summary: "A typographic poster series for a citywide noir film retrospective — 14 posters, one grid.",
      description:
        "The NOIR retrospective screened 31 films across 9 venues. Each screening needed its own poster, but the series needed to read as one voice when wheat-pasted side by side across the city.\nThe solution was a strict typographic system: one grid, one type family, one ink — with each film's title treated as raw typographic material. Some titles rotate, some fragment, some overflow the frame; the system absorbs all of it.",
      client: "Kino Kollektiv",
      date: "2024-08-30",
      tools: ["InDesign", "Illustrator", "Risograph"],
      cover: `${IMG}/project-noir-poster.png`,
      featured: false,
      order: 5,
      accent: "#C6FF00",
      objectives: "Create 14 collectible posters that drive ticket sales citywide while functioning as street-level brand advertising for the festival.",
      challenges: "31 films with wildly different eras and moods; print budget limited to two risograph inks; posters would weather outdoors for three weeks.",
      research: "Studied Swiss plakat tradition and Polish film poster schools. The insight: a rigid system makes typographic play readable as intent rather than noise.",
      strategy: "One grid, infinite titles. Establish rigorous rules for scale, rotation and cropping so each poster feels individual yet unmistakably part of the series.",
      concept: "Black paper, fluorescent lime and white ink. Titles set at 400–800pt, cropped and displaced against the grid; film metadata in a fixed archival column.",
      palette: [
        { name: "Ink Black", hex: "#101010" },
        { name: "Acid Lime", hex: "#C6FF00" },
        { name: "Chalk", hex: "#EDEDE6" },
      ],
      typography: ["Suisse Int'l (system)", "Monument Grotesk (titles)"],
      applications: ["14-screen poster series", "Program booklet", "Street banner set", "Digital venue screens"],
      outcome: "Festival attendance exceeded projections by 22%; three posters sold as limited prints, funding next year's program.",
      gallery: [
        { url: `${IMG}/gallery-poster-detail.png`, alt: "Close-up of NOIR poster ink texture", caption: "Risograph ink texture detail" },
        { url: `${IMG}/project-noir-poster.png`, alt: "NOIR poster series on gallery wall", caption: "The series, pasted as intended" },
      ],
    },
    {
      title: "FERNWAY Travel App",
      slug: "fernway-travel-app",
      category: "UI/UX Design",
      summary: "Product design for a slow-travel planning app — from research to a 120-screen design system.",
      description:
        "FERNWAY helps travelers plan multi-week overland journeys. As founding product designer I ran discovery, information architecture, UI design and the design system through public beta.\nThe core UX problem: multi-city trip planning is inherently messy. FERNWAY turns it into a visual, draggable journey line — the interface metaphor that carried the whole product.",
      client: "FERNWAY Labs",
      date: "2024-03-12",
      tools: ["Figma", "After Effects", "Maze"],
      cover: `${IMG}/project-fernway-ui.png`,
      featured: false,
      order: 6,
      accent: "#C6FF00",
      objectives: "Ship a public beta that demonstrates the journey-line concept convincingly enough to secure seed funding.",
      challenges: "The planning flow spans flights, trains, stays and budgets — enormous state complexity. Also: dark UI with map density can become unreadable fast.",
      research: "18 user interviews with long-term travelers; diary studies of how people actually plan trips (hint: spreadsheets). The journey-line metaphor came directly from users drawing trips on paper maps.",
      strategy: "One core object — the journey line — with everything else as attachments to it. Progressive disclosure keeps casual planners comfortable and power users unblocked.",
      concept: "Dark, map-forward UI with lime accent for interactive states; 4px grid, 8-step type scale, and a component library covering every planning state.",
      palette: [
        { name: "Nightfall", hex: "#0D1117" },
        { name: "Route Lime", hex: "#C6FF00" },
        { name: "Map Mist", hex: "#2A3038" },
      ],
      typography: ["Space Grotesk (UI)", "IBM Plex Mono (data)"],
      applications: ["120-screen design system", "Interactive prototype", "Usability testing kit", "Dev handoff tokens"],
      outcome: "Beta converted 31% of signups to weekly-active planners; the prototype became the centerpiece of the company's seed round deck.",
      gallery: [
        { url: `${IMG}/project-fernway-ui.png`, alt: "FERNWAY app screens", caption: "Journey planning across devices" },
      ],
    },
    {
      title: "ATLAS Quarterly",
      slug: "atlas-quarterly",
      category: "Editorial Design",
      summary: "Editorial system and art direction for an architecture quarterly — brutal grids, humane pacing.",
      description:
        "ATLAS publishes long-form architecture writing. The brief: an editorial system that could handle 4,000-word essays, dense photography and data-heavy features — without ever feeling like a textbook.\nWe built a 12-column grid with deliberate rhythm-breaking rules: pull quotes set at 90pt, folios hidden on chapter openers, and photography allowed to bleed past every margin except one.",
      client: "ATLAS Media",
      date: "2023-10-08",
      tools: ["InDesign", "Photoshop"],
      cover: `${IMG}/project-atlas-editorial.png`,
      featured: false,
      order: 7,
      accent: "#B9BDC4",
      objectives: "Design a reusable editorial system for 4 issues/year covering essays, interviews, photo portfolios and data features.",
      challenges: "Architecture content oscillates between technical density and poetic narrative. The system must make both readable — and let art direction flex without breaking consistency.",
      research: "Deconstructed 12 reference magazines' pacing structures. Interviewed readers on where they abandon long features; findings drove the generous measure and frequent visual 'breathing points'.",
      strategy: "The grid is law; the art direction is improvisation within it. Establish iron rules for type and margins, then codify where and how they may be dramatically broken.",
      concept: "A 12-column grid with three sanctioned 'violations' — full-bleed photography, 90pt pull quotes, and margin-overflowing folios. Chapter openers use editorial serif at theatrical scale.",
      palette: [
        { name: "Newsprint", hex: "#F4F1EA" },
        { name: "Carbon", hex: "#1A1A1A" },
        { name: "Atlas Red", hex: "#C0392B" },
      ],
      typography: ["Freight Text (body)", "Freight Big (display)", "Founders Mono (captions)"],
      applications: ["Master grid templates", "4-issue art direction", "Cover system", "Digital article templates"],
      outcome: "The system produced 4 issues with a two-person editorial team; issue two sold out its print run and won a national editorial design award.",
      gallery: [
        { url: `${IMG}/project-atlas-editorial.png`, alt: "ATLAS Quarterly spread", caption: "Feature spread — the grid at work" },
      ],
    },
    {
      title: "NEBULA Series",
      slug: "nebula-series",
      category: "3D Artwork",
      summary: "An exploration of chrome, glass and light — personal 3D work exhibited as large-format prints.",
      description:
        "NEBULA is an ongoing personal exploration of physical materials in virtual space: chrome ribbons, transmission glass and volumetric light, composed with the discipline of still-life photography rather than the aesthetics of tech demos.\nEight works from the series were exhibited as large-format prints and one animated loop was used as stage visuals at a design conference.",
      client: "Self-initiated",
      date: "2023-05-19",
      tools: ["Blender", "Cinema 4D", "Octane"],
      cover: `${IMG}/project-nebula-3d.png`,
      featured: false,
      order: 8,
      accent: "#C6FF00",
      objectives: "Develop a personal 3D language with the same rigor as commercial identity work — and exhibit it physically.",
      challenges: "3D work often chases spectacle at the cost of composition. The discipline was treating every render like a studio photograph: one light story, one focal center, everything else in service.",
      research: "Studied still-life photography lighting (Madison Avenue product work, 1960s–80s) and translated those lighting grammars into HDRI and area-light setups.",
      strategy: "Photograph virtual objects, don't decorate them. Frame each piece as if it occupies a real studio with real physics.",
      concept: "Chrome ribbons frozen mid-gesture, suspended with transmission glass primitives; lime-tinted bounce cards echo the design practice's accent color.",
      palette: [
        { name: "Liquid Chrome", hex: "#DADDE2" },
        { name: "Void", hex: "#0B0B0B" },
        { name: "Lime Bounce", hex: "#C6FF00" },
      ],
      typography: ["Space Grotesk (exhibition labels)"],
      applications: ["8 large-format prints", "Animated stage loop", "Exhibition identity"],
      outcome: "The series showed at a Berlin design week group show; the animated loop was licensed as stage visuals by a design conference.",
      gallery: [
        { url: `${IMG}/project-nebula-3d.png`, alt: "NEBULA chrome sculpture render", caption: "Study № 4 — chrome & glass" },
      ],
    },
  ];

  for (const p of projects) {
    const created = await db.project.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        title: p.title,
        slug: p.slug,
        summary: p.summary,
        description: p.description,
        categoryId: categories[p.category],
        clientName: p.client,
        projectDate: new Date(p.date),
        year: new Date(p.date).getFullYear(),
        tools: j(p.tools),
        thumbnailUrl: p.cover,
        coverUrl: p.cover,
        accentColor: p.accent,
        objectives: p.objectives,
        challenges: p.challenges,
        research: p.research,
        strategy: p.strategy,
        concept: p.concept,
        colorPalette: j(p.palette),
        typography: j(p.typography),
        applications: j(p.applications),
        outcome: p.outcome,
        featured: p.featured,
        status: "PUBLISHED",
        order: p.order,
        seoTitle: `${p.title} — Case Study`,
        seoDescription: p.summary,
        images: {
          create: p.gallery.map((g, i) => ({
            url: g.url,
            alt: g.alt,
            caption: g.caption,
            order: i,
          })),
        },
      },
    });
    console.log(`✓ Project: ${created.title}`);
  }

  /* ── Services (9) ──────────────────────────────────────── */
  const services = [
    {
      title: "Brand Identity Design", slug: "brand-identity-design", featured: true,
      shortDescription: "Complete identity systems that make your brand impossible to confuse with anyone else.",
      description: "From positioning workshops to full guidelines — naming support, logo suites, color and type systems, imagery direction and the governance to keep it all consistent as you grow.",
      deliverables: ["Discovery & positioning workshop", "Logo suite & brandmark", "Color & typography systems", "Brand guidelines (PDF/Figma)", "Launch asset starter kit"],
      approach: "Strategy before style. Every visual decision is anchored to a documented positioning, so the identity works as a business asset, not just artwork.",
    },
    {
      title: "Logo Design", slug: "logo-design", featured: true,
      shortDescription: "Marks engineered from construction geometry — built to survive decades, not trends.",
      description: "Standalone logo engagements: monograms, wordmarks, symbols and responsive logo systems with construction rationale, clearspace rules and full file governance.",
      deliverables: ["3 concept directions", "Refinement rounds", "Construction grid documentation", "Complete file package (vector/color/BW)", "Mini usage guide"],
      approach: "Grids first, style second. Marks are built on construction systems so scale and craft are guaranteed by geometry, not luck.",
    },
    {
      title: "Social Media Creative Design", slug: "social-media-creative-design", featured: true,
      shortDescription: "Scroll-stopping content systems and template kits your team can actually run with.",
      description: "Campaign concepts, feed systems and motion toolkits for Instagram, TikTok, LinkedIn and YouTube — designed as reusable systems so velocity never costs consistency.",
      deliverables: ["Content system & art direction", "Editable template kit (Figma)", "Motion templates (AE)", "Launch campaign assets", "Team handover session"],
      approach: "Systems over one-offs. We design the engine, generate the launch assets, and train your team to keep producing without diluting the brand.",
    },
    {
      title: "Marketing & Advertising Design", slug: "marketing-advertising-design",
      shortDescription: "Campaign visuals for print, OOH and digital — concept through production-ready artwork.",
      description: "Ad concepting and artwork across channels: display, print, out-of-home, editorial placements and landing-page creative, prepared to each medium's production specs.",
      deliverables: ["Campaign concept boards", "Master key visual", "Channel adaptations", "Production-ready artwork", "Spec compliance sheet"],
      approach: "One strong idea, adapted honestly per channel — never stretched. Each format gets designed for how people actually encounter it.",
    },
    {
      title: "Packaging Design", slug: "packaging-design",
      shortDescription: "Shelf-standing packaging systems from structure to print-ready dielines.",
      description: "Label architecture, structural collaboration, regulatory layout, mockups and production liaison — packaging that survives the retail environment and scales across SKUs.",
      deliverables: ["Packaging architecture", "Label & artwork system", "Dieline collaboration", "3D/photographic mockups", "Print-ready files & specs"],
      approach: "Design for the shelf, the hand and the warehouse. Every system balances shelf standout, tactile experience and production reality.",
    },
    {
      title: "Print Design", slug: "print-design",
      shortDescription: "Brochures, reports, catalogs and stationery with obsessive production quality.",
      description: "Corporate reports, product catalogs, event programs and stationery suites — concept, layout, paper and finish consultation, and press supervision when needed.",
      deliverables: ["Editorial concept", "Grid & layout system", "Print-ready artwork", "Paper & finish spec", "Press check (on request)"],
      approach: "Print is a material medium. Type, paper and finish decisions are made together, in the context of how the piece is held and read.",
    },
    {
      title: "UI/UX Design", slug: "ui-ux-design",
      shortDescription: "Research-led product design and design systems for web and mobile.",
      description: "Discovery, information architecture, wireframes, high-fidelity UI and component systems — with prototyping and usability testing baked into the process.",
      deliverables: ["UX research summary", "IA & user flows", "Hi-fi UI design", "Interactive prototype", "Design system & tokens"],
      approach: "Evidence over taste. Interfaces are argued from user research and tested with real people before they're polished.",
    },
    {
      title: "Motion Graphics", slug: "motion-graphics",
      shortDescription: "Brand-aligned motion systems — logo animation, explainers and social motion kits.",
      description: "Motion identities, animated explainers, event visuals and social motion templates, from storyboards to final renders with sound-sync where needed.",
      deliverables: ["Motion principles doc", "Logo & brand animations", "Storyboard & styleframes", "Final renders (all ratios)", "Source project files"],
      approach: "Motion is brand behavior. Animations are derived from the same logic as the identity — weight, rhythm and restraint included.",
    },
    {
      title: "3D Visual Design", slug: "3d-visual-design",
      shortDescription: "Product visualization, key visuals and abstract 3D artwork with photographic discipline.",
      description: "3D key visuals, product mockups, exhibition artwork and abstract brand imagery — modeled, lit and rendered to photographic standards.",
      deliverables: ["Concept frames", "Modeling & lookdev", "Lighting & rendering", "Final images (print-res)", "Loop animations (optional)"],
      approach: "Virtual photography, not tech demos. Studio lighting grammar, compositional restraint and material honesty.",
    },
  ];
  for (let i = 0; i < services.length; i++) {
    const s = services[i];
    await db.service.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        title: s.title,
        slug: s.slug,
        shortDescription: s.shortDescription,
        description: s.description,
        deliverables: j(s.deliverables),
        approach: s.approach,
        order: i + 1,
        featured: s.featured ?? false,
      },
    });
  }
  console.log("✓ 9 services");

  /* ── Skills ────────────────────────────────────────────── */
  const skills = [
    ["Adobe Photoshop", "SOFTWARE", 95], ["Adobe Illustrator", "SOFTWARE", 97],
    ["Adobe InDesign", "SOFTWARE", 90], ["Adobe After Effects", "SOFTWARE", 85],
    ["Figma", "SOFTWARE", 92], ["Blender", "SOFTWARE", 78], ["Cinema 4D", "SOFTWARE", 74],
    ["Visual Identity", "EXPERTISE", 95], ["Typography", "EXPERTISE", 92],
    ["Color Theory", "EXPERTISE", 90], ["Layout Design", "EXPERTISE", 93],
    ["Creative Direction", "EXPERTISE", 88], ["Visual Storytelling", "EXPERTISE", 91],
    ["Brand Strategy", "EXPERTISE", 89],
  ] as const;
  for (let i = 0; i < skills.length; i++) {
    const [name, category, level] = skills[i];
    const exists = await db.skill.findFirst({ where: { name } });
    if (!exists) {
      await db.skill.create({ data: { name, category, level, order: i + 1 } });
    }
  }
  console.log("✓ 14 skills");

  /* ── Experience / Education / Certifications / Achievements ── */
  const experiences = [
    { role: "Founder & Design Director", company: "Adrian Vale Studio", location: "Berlin", start: "2024-01-01", current: true, description: "Independent practice focused on brand identity, packaging and editorial systems for clients across Europe and North America." },
    { role: "Lead Brand Designer", company: "NORDWERK Agency", location: "Berlin", start: "2022-03-01", end: "2023-12-01", description: "Led identity programs for industrial and cultural clients; built the agency's design system methodology and mentored a team of four designers." },
    { role: "Art Director", company: "FIELD & FORM", location: "Amsterdam", start: "2019-06-01", end: "2022-02-01", description: "Art direction for packaging and campaigns across FMCG and lifestyle accounts; two projects awarded at national design competitions." },
    { role: "Senior Graphic Designer", company: "Studio Mono", location: "Berlin", start: "2016-09-01", end: "2019-05-01", description: "Identity and editorial design for publishing and architecture clients; introduced the studio's first systematic prototyping workflow." },
  ];
  for (let i = 0; i < experiences.length; i++) {
    const e = experiences[i];
    const exists = await db.experience.findFirst({ where: { company: e.company, role: e.role } });
    if (!exists) {
      await db.experience.create({
        data: {
          role: e.role, company: e.company, location: e.location,
          description: e.description,
          startDate: new Date(e.start),
          endDate: e.end ? new Date(e.end) : null,
          current: !!e.current, order: i + 1,
        },
      });
    }
  }

  const educationData = [
    { degree: "BA Communication Design", institution: "University of the Arts, Berlin", field: "Graphic Design", start: "2013-10-01", end: "2017-09-01", description: "Thesis on typographic systems in public signage — awarded with distinction." },
    { degree: "Exchange Semester", institution: "Design Academy Eindhoven", field: "Man & Identity", start: "2016-08-01", end: "2016-12-01", description: "Material-driven design research track." },
  ];
  for (let i = 0; i < educationData.length; i++) {
    const e = educationData[i];
    const exists = await db.education.findFirst({ where: { institution: e.institution, degree: e.degree } });
    if (!exists) {
      await db.education.create({
        data: {
          degree: e.degree, institution: e.institution, field: e.field,
          description: e.description,
          startDate: new Date(e.start), endDate: new Date(e.end), order: i + 1,
        },
      });
    }
  }

  const certs = [
    { name: "Adobe Certified Professional — Visual Design", issuer: "Adobe", issueDate: "2021-05-01" },
    { name: "Google UX Design Certificate", issuer: "Google", issueDate: "2022-11-01" },
    { name: "Type@Cooper — Extended Program (Condensed)", issuer: "Type@Cooper", issueDate: "2019-07-01" },
  ];
  for (let i = 0; i < certs.length; i++) {
    const c = certs[i];
    const exists = await db.certification.findFirst({ where: { name: c.name } });
    if (!exists) {
      await db.certification.create({ data: { name: c.name, issuer: c.issuer, issueDate: new Date(c.issueDate), order: i + 1 } });
    }
  }

  const achievementsData = [
    { title: "D&AD Wood Pencil — Brand Identity", organization: "D&AD", year: 2023, description: "For the LUMEN Coffee Roasters identity system." },
    { title: "European Design Award — Packaging (Silver)", organization: "European Design", year: 2024, description: "TERRA Botanicals packaging architecture." },
    { title: "Behance Featured — Graphic Design", organization: "Adobe Behance", year: 2022, description: "NOIR typographic poster series curated to the homepage." },
    { title: "ADC Germany — Merit Award", organization: "Art Directors Club Deutschland", year: 2021, description: "Editorial design for ATLAS Quarterly pilot issue." },
  ];
  for (let i = 0; i < achievementsData.length; i++) {
    const a = achievementsData[i];
    const exists = await db.achievement.findFirst({ where: { title: a.title } });
    if (!exists) {
      await db.achievement.create({ data: { ...a, order: i + 1 } });
    }
  }
  console.log("✓ Experience, education, certifications, achievements");

  /* ── Testimonials ──────────────────────────────────────── */
  const testimonialsData = [
    {
      clientName: "Mara Lindqvist", company: "CEO, LUMEN Kaffee GmbH",
      review: "Adrian didn't just redesign our brand — he found a story inside our company that we hadn't been able to articulate ourselves. The identity paid for itself within the first quarter of wholesale launches.",
      projectReference: "LUMEN Coffee Roasters", rating: 5, featured: true,
      date: "2025-10-12",
    },
    {
      clientName: "Jonas Weber", company: "CMO, TERRA Skincare AB",
      review: "The packaging system absorbed six new SKUs without a single structural change — that's the kind of systems thinking you don't know you need until you have it. Retail buyers noticed immediately.",
      projectReference: "TERRA Botanicals", rating: 5, featured: true,
      date: "2025-02-03",
    },
    {
      clientName: "Priya Raman", company: "Head of Product, FERNWAY Labs",
      review: "Adrian works like a product designer who happens to be a world-class visual designer. Our seed investors specifically mentioned the prototype design in the first meeting.",
      projectReference: "FERNWAY Travel App", rating: 5, featured: true,
      date: "2024-06-18",
    },
    {
      clientName: "Daniel Okafor", company: "Director, Kino Kollektiv",
      review: "Fourteen posters, one unmistakable voice. People photographed them on the street and tagged the festival — the design became part of the city for three weeks.",
      projectReference: "NOIR Film Festival", rating: 5, featured: false,
      date: "2024-09-30",
    },
  ];
  for (let i = 0; i < testimonialsData.length; i++) {
    const t = testimonialsData[i];
    const exists = await db.testimonial.findFirst({ where: { clientName: t.clientName, projectReference: t.projectReference } });
    if (!exists) {
      await db.testimonial.create({
        data: {
          clientName: t.clientName, company: t.company, review: t.review,
          projectReference: t.projectReference, rating: t.rating,
          date: new Date(t.date), published: true, featured: t.featured, order: i + 1,
        },
      });
    }
  }
  console.log("✓ 4 published testimonials");

  /* ── Social links ──────────────────────────────────────── */
  const socials = [
    { platform: "Behance", label: "Behance", url: "https://behance.net/adrianvale-demo", order: 1 },
    { platform: "Dribbble", label: "Dribbble", url: "https://dribbble.com/adrianvale-demo", order: 2 },
    { platform: "Instagram", label: "Instagram", url: "https://instagram.com/adrianvale.demo", order: 3 },
    { platform: "LinkedIn", label: "LinkedIn", url: "https://linkedin.com/in/adrianvale-demo", order: 4 },
    { platform: "WhatsApp", label: "WhatsApp", url: "https://wa.me/4900000000000", order: 5 },
  ];
  for (const s of socials) {
    const exists = await db.socialLink.findFirst({ where: { platform: s.platform } });
    if (!exists) {
      await db.socialLink.create({ data: { ...s, icon: null, visible: true } });
    }
  }
  console.log("✓ Social links (demo URLs)");

  /* ── Website settings ──────────────────────────────────── */
  await db.websiteSetting.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      siteName: "Adrian Vale",
      logoText: "Adrian Vale",
      tagline: "Graphic Designer & Art Director",
      metaTitle: "Adrian Vale® — Graphic Designer & Visual Storyteller",
      metaDescription:
        "Independent graphic designer crafting brand identities, editorial systems and visual experiences. Portfolio, services and case studies.",
      metaKeywords: "graphic designer, brand identity, packaging design, editorial design, Berlin",
      ogImageUrl: `${IMG}/og-image.png`,
      contactEmail: "hello@adrianvale.studio",
      whatsappUrl: "https://wa.me/4900000000000",
      footerText:
        "Independent graphic design practice in Berlin — crafting brand identities, editorial systems and visual experiences since 2016.",
      copyrightText: "Adrian Vale. All rights reserved.",
      cvUrl: "/uploads/cv/adrian-vale-cv.pdf",
      accentColor: "#C6FF00",
    },
  });
  console.log("✓ Website settings");

  /* ── Sample inquiries ──────────────────────────────────── */
  const inquiryCount = await db.contactInquiry.count();
  if (inquiryCount === 0) {
    await db.contactInquiry.createMany({
      data: [
        {
          fullName: "Elena Marsh", email: "elena@northcoffee.co", company: "North Coffee Co.",
          projectType: "Brand Identity", budgetRange: "$10k – $25k", timeline: "1–2 months",
          message:
            "Hi Adrian, we're a specialty coffee chain expanding from 4 to 12 locations next year and our current identity can't scale. We love the LUMEN system's discipline and would like to discuss a similar engagement — rebrand, packaging and café signage. What does a typical timeline look like?",
          status: "UNREAD",
        },
        {
          fullName: "Tomás Herrera", email: "t.herrera@vinoserra.es", company: "Vinos Serra",
          projectType: "Packaging Design", budgetRange: "$5k – $10k", timeline: "3–6 months",
          message:
            "We're launching a natural wine line (6 labels) this autumn and need packaging with real shelf presence. Saw the TERRA work — the layered label architecture is exactly the direction we're thinking. Are you taking projects for autumn?",
          status: "READ",
          adminNotes: "Sent intro deck 12 Oct. Follow up after his harvest season (Nov). Budget confirmed verbally.",
        },
        {
          fullName: "Kelsey Bloom", email: "kb@bloomstudio.co", company: "Bloom Studio",
          projectType: "Something else", budgetRange: "Prefer to discuss", timeline: "ASAP",
          message:
            "Hello! We're a small branding studio in Rotterdam and we're looking for a senior freelance collaborator for a client project — mostly editorial layout work, 3–4 weeks. Are you open to subcontracting, and what does day-rate collaboration usually look like for you?",
          status: "READ",
        },
      ],
    });
    console.log("✓ 3 sample inquiries (1 unread)");
  }

  console.log("\nSEED COMPLETE — demo content is clearly sample data.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
