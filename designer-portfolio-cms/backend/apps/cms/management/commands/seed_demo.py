"""
Seed the CMS with demo content (clearly marked as demo in README and project
summaries). Idempotent: skips when a Profile already exists unless FORCE=1.

    .venv/bin/python manage.py seed_demo            # seed if empty
    FORCE=1 .venv/bin/python manage.py seed_demo    # wipe content tables + reseed
"""
import json
import os
from datetime import date, datetime, timezone as dt_timezone

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand

from apps.accounts.models import AdminUser
from apps.cms.models import (
    Achievement,
    Certification,
    Education,
    Experience,
    HomepageSection,
    MediaAsset,
    NavigationItem,
    Profile,
    Service,
    Skill,
    SocialLink,
    Testimonial,
    ThemeConfig,
    WebsiteSetting,
)
from apps.inquiries.models import ContactInquiry
from apps.portfolio.models import Project, ProjectCategory, ProjectImage

DEMO_IMAGES = [
    ("portrait.png", "profile"),
    ("og-image.png", "general"),
    ("project-lumen-brand.png", "projects"),
    ("project-halcyon-logo.png", "projects"),
    ("project-pulse-social.png", "projects"),
    ("project-fernway-ui.png", "projects"),
    ("project-terra-packaging.png", "projects"),
    ("project-noir-poster.png", "projects"),
    ("project-atlas-editorial.png", "projects"),
    ("project-nebula-3d.png", "projects"),
    ("gallery-brand-stationery.png", "projects"),
    ("gallery-poster-detail.png", "projects"),
    ("gallery-packaging-shots.png", "projects"),
]

CATEGORIES = [
    ("Brand Identity", "brand-identity", "Complete visual identity systems that scale."),
    ("Logo Design", "logo-design", "Distinctive marks built on strategy."),
    ("Social Media Design", "social-media-design", "Scroll-stopping social content systems."),
    ("Advertising Design", "advertising-design", "Campaign visuals that convert."),
    ("UI/UX Design", "ui-ux-design", "Digital product interfaces with intent."),
    ("Packaging Design", "packaging-design", "Physical products worth picking up."),
    ("Print Design", "print-design", "Tactile design with production craft."),
    ("Poster Design", "poster-design", "Large-format graphic statements."),
    ("Motion Graphics", "motion-graphics", "Animated brand moments."),
    ("3D Artwork", "3d-artwork", "Sculptural renders and CGI visuals."),
    ("Illustration", "illustration", "Custom drawn visual languages."),
    ("Editorial Design", "editorial-design", "Magazine-grade layout systems."),
]

PROJECTS = [
    {
        "title": "Lumen — Brand Identity System",
        "slug": "lumen-brand-identity",
        "category": "brand-identity",
        "clientName": "Lumen Technologies (Demo)",
        "projectDate": date(2025, 3, 1),
        "featured": True,
        "order": 1,
        "summary": "A full identity system for a clean-energy startup — strategy, logotype, colour, typography and a 40-page brand book. Demo project for template preview.",
        "description": "Lumen needed an identity that felt engineered rather than decorated. We built the brand around a single 'light index' grid that drives logo construction, layout and motion.\nDeliverables spanned strategy, visual identity, brand book, stationery and launch templates.",
        "tools": ["Illustrator", "Figma", "After Effects", "Photoshop"],
        "objectives": "Reposition Lumen from a generic installer to a technology-forward energy brand trusted by enterprises.",
        "challenges": "The energy sector is saturated with blue-green clichés; the mark also had to survive tiny favicon sizes and large site signage.",
        "research": "We audited 24 competitors and interviewed 9 procurement stakeholders to map visual territory and trust cues.",
        "strategy": "Own 'precision light' as the brand idea — everything from the wordmark's beam-cut A to the photographic lens flare language reinforces it.",
        "concept": "A geometric sun-beam monogram that deconstructs into a flexible modular grid, paired with an ink-black and photon-lime palette.",
        "outcome": "Launch quarter saw a 34% lift in qualified enterprise leads and the identity was featured in two design annuals.",
        "colorPalette": [{"name": "Photon Lime", "hex": "#C6FF00"}, {"name": "Ink", "hex": "#0E0E10"}, {"name": "Signal White", "hex": "#FAFAF7"}, {"name": "Graphite", "hex": "#4A4A4F"}],
        "typography": ["Space Grotesk — display", "Inter — text", "IBM Plex Mono — data"],
        "applications": ["Brand book", "Stationery suite", "Site signage", "Pitch deck templates", "Social launch kit"],
        "thumbnailUrl": "/uploads/demo/project-lumen-brand.png",
        "coverUrl": "/uploads/demo/project-lumen-brand.png",
        "images": [("gallery-brand-stationery.png", "Stationery suite on uncoated stock", "The beam-cut monogram is blind-embossed on the letterhead.")],
    },
    {
        "title": "Halcyon — Logotype & Mark",
        "slug": "halcyon-logotype",
        "category": "logo-design",
        "clientName": "Halcyon Hotels (Demo)",
        "projectDate": date(2024, 11, 1),
        "featured": True,
        "order": 2,
        "summary": "A calm, editorial logotype and monogram for a boutique hotel group. Demo project for template preview.",
        "description": "Halcyon wanted quiet luxury without the usual serif clichés. The final logotype pairs a high-contrast grotesque with a custom wave-cut H monogram that doubles as a wayfinding glyph across the property.",
        "tools": ["Illustrator", "Glyphs"],
        "objectives": "Create a mark that feels calm, coastal and crafted — recognisable from a matchbook to a marquee.",
        "challenges": "The H had to remain elegant at 16px while carrying enough character to embroider on bathrobes.",
        "research": "Guest journals, coastal typography archives and 1930s transatlantic liner ephemera.",
        "strategy": "Lead with restraint: one weight, one modifier, generous letterspacing.",
        "concept": "A wave-cut counter inside the H, echoing the harbour timeline of the founding property.",
        "outcome": "Rolled out across 4 properties, 60+ touchpoints; occupancy marketing CTR up 18%.",
        "colorPalette": [{"name": "Sea Salt", "hex": "#EFEDE6"}, {"name": "Deep Tide", "hex": "#16302B"}, {"name": "Brass", "hex": "#B08D57"}],
        "typography": ["Custom logotype", "Canela — headings", "Inter — text"],
        "applications": ["Logotype", "Monogram", "Amenity branding", "Wayfinding"],
        "thumbnailUrl": "/uploads/demo/project-halcyon-logo.png",
        "coverUrl": "/uploads/demo/project-halcyon-logo.png",
        "images": [],
    },
    {
        "title": "Pulse — Social Campaign System",
        "slug": "pulse-social-campaign",
        "category": "social-media-design",
        "clientName": "Pulse Fitness (Demo)",
        "projectDate": date(2025, 6, 1),
        "featured": False,
        "order": 3,
        "summary": "A modular social design system producing 120+ on-brand posts per quarter. Demo project for template preview.",
        "description": "We replaced ad-hoc posting with a template engine: three layout archetypes, a kinetic type ramp and a colour-coded content taxonomy that the in-house team can run without a designer on every post.",
        "tools": ["Figma", "After Effects", "Photoshop"],
        "objectives": "Increase reach and save production time with a self-serve template system.",
        "challenges": "A 4-person marketing team with no design support needed to ship daily content.",
        "research": "Audited 500 posts; the top decile shared one pattern — bold numeral + cropped action shot.",
        "strategy": "Design the system, not the posts: rules over assets.",
        "concept": "The 'Pulse Ramp' — a diagonal energy line that stitches carousels together.",
        "outcome": "Engagement up 41%; production time per post down from 90 to 12 minutes.",
        "colorPalette": [{"name": "Volt", "hex": "#D4FF3F"}, {"name": "Blackout", "hex": "#0A0A0A"}, {"name": "Steam", "hex": "#E8E8E3"}],
        "typography": ["Druk — impact", "Inter — captions"],
        "applications": ["Instagram system", "Story templates", "Reel title cards"],
        "thumbnailUrl": "/uploads/demo/project-pulse-social.png",
        "coverUrl": "/uploads/demo/project-pulse-social.png",
        "images": [],
    },
    {
        "title": "Fernway — Product UI Kit",
        "slug": "fernway-ui-kit",
        "category": "ui-ux-design",
        "clientName": "Fernway Travel (Demo)",
        "projectDate": date(2024, 7, 1),
        "featured": True,
        "order": 4,
        "summary": "A design system and booking-flow redesign for a sustainable travel platform. Demo project for template preview.",
        "description": "Fernway's booking flow leaked users at the date picker. We rebuilt the core flow around a single progressive form and shipped a 60-component design library with tokens, dark mode and full keyboard support.",
        "tools": ["Figma", "Zeplin", "Maze"],
        "objectives": "Cut booking abandonment and give engineering a token-based system.",
        "challenges": "Legacy flow had 11 screens for a 4-field form; carbon metrics had to stay legible.",
        "research": "12 moderated sessions; heatmap analysis of 30k sessions.",
        "strategy": "Progressive disclosure — one question per screen, instant price feedback.",
        "concept": "A 'route ribbon' that visualises the trip as you build it.",
        "outcome": "Booking completion up 27%; support tickets about pricing down by half.",
        "colorPalette": [{"name": "Moss", "hex": "#2E4B3C"}, {"name": "Birch", "hex": "#F4F2EC"}, {"name": "River", "hex": "#5B8FA8"}],
        "typography": ["Söhne — UI", "Inter — body"],
        "applications": ["Design system", "Web booking flow", "Mobile app v2"],
        "thumbnailUrl": "/uploads/demo/project-fernway-ui.png",
        "coverUrl": "/uploads/demo/project-fernway-ui.png",
        "images": [],
    },
    {
        "title": "Terra — Packaging Range",
        "slug": "terra-packaging-range",
        "category": "packaging-design",
        "clientName": "Terra Botanicals (Demo)",
        "projectDate": date(2025, 1, 1),
        "featured": False,
        "order": 5,
        "summary": "A tactile packaging system for a botanical skincare range. Demo project for template preview.",
        "description": "Nine SKUs, one system: a botanical index number, embossed leaf marks and a muted mineral palette printed on recycled fibreboard. The design photographs beautifully and shelves even better.",
        "tools": ["Illustrator", "Dimensions", "InDesign"],
        "objectives": "Differentiate a crowded shelf while keeping the print run affordable.",
        "challenges": "Two spot colours only; emboss registration on recycled stock is unforgiving.",
        "research": "Retail shelf audits in 6 stores; material sampling with 3 mills.",
        "strategy": "Let the material be the brand — minimal ink, maximal texture.",
        "concept": "A numbered botanical index that grows into a collectible shelf set.",
        "outcome": "Sell-through up 22% in the first cycle; shortlisted for a packaging award.",
        "colorPalette": [{"name": "Clay", "hex": "#C7B9A5"}, {"name": "Fern", "hex": "#3E5641"}, {"name": "Chalk", "hex": "#F1EFE9"}],
        "typography": ["Canela — brand", "Founders Grotesk — data"],
        "applications": ["Primary packaging", "Cartons", "Inserts", "Shipper boxes"],
        "thumbnailUrl": "/uploads/demo/project-terra-packaging.png",
        "coverUrl": "/uploads/demo/project-terra-packaging.png",
        "images": [("gallery-packaging-shots.png", "Packaging family shot", "The nine-SKU range with embossed leaf marks.")],
    },
    {
        "title": "Noir — Film Festival Posters",
        "slug": "noir-festival-posters",
        "category": "poster-design",
        "clientName": "Noir Film Festival (Demo)",
        "projectDate": date(2024, 9, 1),
        "featured": True,
        "order": 6,
        "summary": "A typographic poster series for a noir film festival. Demo project for template preview.",
        "description": "Six posters, one grid: oversized condensed type, a hard spotlight gradient and a single frame of each film cropped to abstract geometry. Printed A0 on matte black stock.",
        "tools": ["InDesign", "Photoshop", "Illustrator"],
        "objectives": "Make the festival recognisable from across the street.",
        "challenges": "Six very different films under one visual voice; budget limited us to 2 colours.",
        "research": "Studied Polish poster school, 1950s film title cards and projection-light physics.",
        "strategy": "Type as spotlight — the title IS the light source.",
        "concept": "A diagonal light shaft cutting each poster, revealing a key frame.",
        "outcome": "Festival attendance up 30%; the series was exhibited and pirated (the best compliment).",
        "colorPalette": [{"name": "Noir Black", "hex": "#0B0B0C"}, {"name": "Spotlight", "hex": "#FFE9B8"}, {"name": "Signal Red", "hex": "#E63B2E"}],
        "typography": ["Druk Condensed — display", "Inter — credits"],
        "applications": ["A0 poster series", "Programme", "Ticketing", "Social crops"],
        "thumbnailUrl": "/uploads/demo/project-noir-poster.png",
        "coverUrl": "/uploads/demo/project-noir-poster.png",
        "images": [("gallery-poster-detail.png", "Poster detail — light shaft crop", "Two-colour A0 print on matte black stock.")],
    },
    {
        "title": "Atlas — Editorial Platform",
        "slug": "atlas-editorial-platform",
        "category": "editorial-design",
        "clientName": "Atlas Quarterly (Demo)",
        "projectDate": date(2024, 3, 1),
        "featured": False,
        "order": 7,
        "summary": "Art direction and template system for a print-and-digital geography journal. Demo project for template preview.",
        "description": "Atlas publishes long-form geography writing. We designed a flexible editorial grid that survives 8,000-word features and data-dense map spreads, in print and on the web reader.",
        "tools": ["InDesign", "Figma", "QGIS"],
        "objectives": "Unify print and digital reading with one editorial language.",
        "challenges": "Dense cartography competing with body text; 3-person editorial team.",
        "research": "Compared 14 journals; mapped reading patterns on the existing web reader.",
        "strategy": "The map is the hero image — every layout is built around it.",
        "concept": "A 12-column grid with a full-bleed 'atlas band' that anchors each feature.",
        "outcome": "Reader time on page up 35%; two features picked up by mainstream media.",
        "colorPalette": [{"name": "Parchment", "hex": "#F5F1E8"}, {"name": "Contour", "hex": "#7A6C5D"}, {"name": "Ink Line", "hex": "#1C1B18"}],
        "typography": ["Freight Text — body", "Space Grotesk — captions", "Sohne Mono — data"],
        "applications": ["Print magazine", "Web reader", "Newsletter"],
        "thumbnailUrl": "/uploads/demo/project-atlas-editorial.png",
        "coverUrl": "/uploads/demo/project-atlas-editorial.png",
        "images": [],
    },
    {
        "title": "Nebula — 3D Art Series",
        "slug": "nebula-3d-art-series",
        "category": "3d-artwork",
        "clientName": "Self-initiated (Demo)",
        "projectDate": date(2025, 8, 1),
        "featured": True,
        "order": 8,
        "summary": "A chrome-and-glass 3D sculpture series exploring light, distortion and inertia. Demo project for template preview.",
        "description": "An ongoing personal series: procedurally deformed chrome forms suspended in studio light, rendered with a physical glass satellite system. Used across this portfolio as the visual identity of the hero scene.",
        "tools": ["Blender", "Cinema 4D", "Octane"],
        "objectives": "Build a signature 3D language that could carry the whole studio brand.",
        "challenges": "Chrome shows every topology mistake; glass caustics blow render farms.",
        "research": "Anish Kapoor reflections, brutalist massing, studio photography setups.",
        "strategy": "Constrain to one material system and iterate form, not finish.",
        "concept": "Inertia — heavy chrome torsions held by fragile glass satellites.",
        "outcome": "The series became the studio's identity: hero scene, case covers and merch.",
        "colorPalette": [{"name": "Chrome", "hex": "#D9DCE1"}, {"name": "Void", "hex": "#080808"}, {"name": "Photon", "hex": "#C6FF00"}],
        "typography": ["Space Grotesk — titles", "Inter — captions"],
        "applications": ["Hero 3D scene", "Print series", "Social loop assets"],
        "thumbnailUrl": "/uploads/demo/project-nebula-3d.png",
        "coverUrl": "/uploads/demo/project-nebula-3d.png",
        "images": [],
    },
]

SERVICES = [
    ("Brand Identity & Strategy", "brand-identity-strategy", "Research-led identity systems that give your brand a spine, not just a style.", ["Brand strategy workshop", "Visual identity system", "Brand guidelines book", "Launch asset kit"], "Discover → Define → Design → Deliver. Every identity starts with stakeholder interviews and a competitive visual audit before any pixels are placed.", "Compass", True),
    ("Logo Design", "logo-design-service", "Distinctive marks engineered to work from favicon to facade.", ["3 concept territories", "Master logo + variations", "Usage guidelines", "Source files"], "We test marks at 16px, in one colour, and upside down. If it survives that, it survives anything.", "PenTool", True),
    ("Social Media Design", "social-media-design-service", "Template systems your team can actually run without a designer babysitting every post.", ["Social audit", "Template system (3 archetypes)", "Motion end-cards", "Team handover session"], "We design rules, not one-offs — a taxonomy, a layout library and a colour system the team self-serves.", "Share2", True),
    ("Advertising Campaign Design", "advertising-design-service", "Campaign key visuals and adaptation systems across OOH, digital and print.", ["Key visual", "Adaptation grid", "Media-ready exports", "Production liaison"], "One strong idea, adapted ruthlessly. We build the adaptation grid before the key visual so nothing breaks in round 3.", "Megaphone", False),
    ("UI/UX Design", "ui-ux-design-service", "Interfaces with intent — flows, systems and production-ready component libraries.", ["UX flow mapping", "High-fidelity UI", "Design tokens + components", "Dev handoff"], "Prototype early, test with real users, then systematise. We ship Figma libraries engineers actually enjoy.", "LayoutGrid", False),
    ("Packaging Design", "packaging-design-service", "Shelf-ready packaging with production-safe dielines and print supervision.", ["Structural dielines", "Range architecture", "Print-ready artwork", "Press check"], "We sample materials before we design, because texture is a design decision, not an afterthought.", "Package", False),
    ("Print & Editorial Design", "print-editorial-design", "Magazine-grade layout systems for reports, journals and books.", ["Grid system", "Typographic system", "Template library", "Print management"], "Editorial design is rhythm: baseline grids, measured white space and maps that breathe.", "BookOpen", False),
    ("Poster Design", "poster-design-service", "Large-format typographic statements for events and culture.", ["Concept territories", "Master poster", "Format adaptations", "Print-ready files"], "A poster must win at 5 metres and reward at 50cm. Type is the spotlight; everything else supports it.", "RectangleHorizontal", False),
    ("Motion Graphics & 3D", "motion-graphics-3d", "Animated brand moments and sculptural 3D visual systems.", ["Styleframes", "Motion system", "3D asset library", "Loop deliverables"], "From styleframes to final loops — chrome, glass and light built to move.", "Box", False),
]

SKILLS_SOFTWARE = [
    ("Photoshop", 95), ("Illustrator", 97), ("After Effects", 88), ("Figma", 92),
    ("Blender", 84), ("Cinema 4D", 80), ("InDesign", 90),
]
SKILLS_EXPERTISE = [
    ("Brand Identity", 94), ("Typography", 90), ("Editorial Layout", 88), ("3D Rendering", 82),
    ("Art Direction", 91), ("Colour Theory", 93), ("Packaging Design", 85),
]

HOME_SECTIONS = [
    ("hero", 1, "Adrian Vale", "Independent graphic designer & art director", "Building brands, systems and sculptural visuals for teams with taste.", {
        "headlineLines": ["I DON'T JUST DESIGN.", "I CREATE VISUAL", "EXPERIENCES."],
        "ctaPrimary": {"label": "View Work", "path": "/portfolio"},
        "ctaSecondary": {"label": "Let's Talk", "path": "/contact"},
        "showStats": True,
        "stats": [{"value": "9+", "label": "Years"}, {"value": "60+", "label": "Clients"}, {"value": "120+", "label": "Projects"}],
    }, "gradient"),
    ("marquee", 2, "", "", "", {"words": ["BRAND IDENTITY", "LOGO DESIGN", "ART DIRECTION", "3D VISUALS", "EDITORIAL", "PACKAGING", "MOTION", "TYPOGRAPHY"]}, "none"),
    ("featured_projects", 3, "Selected Work", "FEATURED PROJECTS", "A tight selection of identity, digital and dimensional work.", {"limit": 4, "mode": "auto"}, "none"),
    ("about_preview", 4, "About", "DESIGN WITH INTENT", "", {"ctaLabel": "About Me", "ctaPath": "/about", "showStats": True}, "none"),
    ("services_preview", 5, "What I Do", "SERVICES", "", {"limit": 4}, "none"),
    ("skills_preview", 6, "Toolkit", "SKILLS & TOOLS", "", {"limit": 6}, "none"),
    ("testimonials_preview", 7, "Client Words", "TESTIMONIALS", "", {"limit": 3}, "none"),
    ("contact_cta", 8, "Contact", "GET IN TOUCH", "Have a project in mind? Let's make something remarkable.", {
        "headline": "HAVE A PROJECT IN MIND?",
        "sub": "LET'S MAKE SOMETHING REMARKABLE.",
        "ctaLabel": "Start a Project",
        "ctaPath": "/contact",
    }, "gradient"),
]

NAV_HEADER = [("Home", "/"), ("About", "/about"), ("Portfolio", "/portfolio"), ("Services", "/services"), ("Contact", "/contact")]
NAV_FOOTER = [("Home", "/"), ("About", "/about"), ("Portfolio", "/portfolio"), ("Services", "/services"), ("Skills", "/skills"), ("Experience", "/experience"), ("Contact", "/contact")]

SOCIALS = [
    ("Behance", "Behance", "https://behance.net/adrianvale-demo", "Palette"),
    ("Dribbble", "Dribbble", "https://dribbble.com/adrianvale-demo", "Dribbble"),
    ("Instagram", "Instagram", "https://instagram.com/adrianvale.demo", "Instagram"),
    ("LinkedIn", "LinkedIn", "https://linkedin.com/in/adrianvale-demo", "Linkedin"),
    ("WhatsApp", "WhatsApp", "https://wa.me/15550000000", "MessageCircle"),
]

TESTIMONIALS = [
    ("Maren Kjeldsen", "CMO, Lumen Technologies", "Adrian turned a vague 'we need to look premium' into a system our whole company runs on. The brand book alone paid for itself.", "Lumen — Brand Identity System", 5, True),
    ("Daniel Okafor", "Founder, Terra Botanicals", "He samples paper before designing a single dieline. Our shelf presence went from invisible to collectible.", "Terra — Packaging Range", 5, True),
    ("Sofia Marchetti", "Product Lead, Fernway", "The booking flow redesign paid for itself in six weeks. Completion up 27% — and engineering actually likes the tokens.", "Fernway — Product UI Kit", 4, False),
    ("James Whitfield", "Director, Noir Film Festival", "The poster series stopped traffic — literally. Attendance jumped 30% and we had to reprint twice.", "Noir — Film Festival Posters", 5, False),
]

INQUIRIES = [
    ("Elena Rodriguez", "elena.rodriguez@demo.co", "Northwind Studio", "Brand Identity", "$10k–25k", "1–3 months", "We're a boutique architecture studio rebranding after 12 years. We love the Lumen case study and want something similarly systematic.", "UNREAD", ""),
    ("Tom Becker", "tom@beckerdemo.io", "Becker Labs", "UI/UX Design", "$25k–50k", "3–6 months", "Series-A SaaS, need a design system rebuild before our platform launch in Q2. Timeline flexible but quality bar is high.", "READ", "Sent intro deck — follow up after their board meeting."),
    ("Priya Nair", "priya@demohealth.org", "Demo Health", "Packaging Design", "$5k–10k", "1 month", "Small wellness brand, need a 3-SKU packaging refresh on a tight budget and tighter deadline.", "READ", ""),
]


class Command(BaseCommand):
    help = "Seed the CMS with clearly-marked demo content"

    def handle(self, *args, **options):
        force = os.environ.get("FORCE") == "1"
        if Profile.objects.exists() and not force:
            self.stdout.write(self.style.WARNING("Demo data already present — skipping (use FORCE=1 to reseed)"))
            return

        if force:
            for model in [ProjectImage, Project, ProjectCategory, Service, Skill, Experience,
                          Education, Certification, Achievement, Testimonial, SocialLink,
                          ContactInquiry, HomepageSection, NavigationItem, MediaAsset]:
                model.objects.all().delete()
            Profile.objects.all().delete()
            WebsiteSetting.objects.all().delete()
            ThemeConfig.objects.all().delete()

        # --- Admin user ---
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@vale.studio")
        admin_password = os.environ.get("ADMIN_PASSWORD", "ValeStudio#2026")
        admin, created = AdminUser.objects.get_or_create(
            email=admin_email,
            defaults={
                "passwordHash": make_password(admin_password),
                "name": "Studio Admin",
                "role": "ADMIN",
            },
        )
        if not created and not admin.passwordHash.startswith("pbkdf2"):
            admin.passwordHash = make_password(admin_password)
            admin.save(update_fields=["passwordHash", "updatedAt"])

        # --- Media asset rows for the pre-generated demo files ---
        upload_root = settings.UPLOAD_ROOT
        for filename, folder in DEMO_IMAGES:
            path = upload_root / "demo" / filename
            size = path.stat().st_size if path.exists() else 400_000
            MediaAsset.objects.get_or_create(
                url=f"/uploads/demo/{filename}",
                defaults={
                    "filename": filename,
                    "originalName": filename,
                    "mimeType": "image/png",
                    "size": size,
                    "folder": folder,
                    "alt": f"Demo artwork — {filename.replace('-', ' ').replace('.png', '')}",
                    "caption": "Demo image generated for template preview",
                },
            )

        # --- Categories ---
        for order, (name, slug, desc) in enumerate(CATEGORIES):
            ProjectCategory.objects.get_or_create(
                slug=slug, defaults={"name": name, "description": desc, "order": order}
            )

        # --- Projects ---
        for spec in PROJECTS:
            category = ProjectCategory.objects.get(slug=spec["category"])
            project, _ = Project.objects.get_or_create(
                slug=spec["slug"],
                defaults={
                    "title": spec["title"],
                    "summary": spec["summary"],
                    "description": spec["description"],
                    "category": category,
                    "clientName": spec["clientName"],
                    "projectDate": spec["projectDate"],
                    "year": spec["projectDate"].year,
                    "tools": json.dumps(spec["tools"]),
                    "thumbnailUrl": spec["thumbnailUrl"],
                    "coverUrl": spec["coverUrl"],
                    "objectives": spec["objectives"],
                    "challenges": spec["challenges"],
                    "research": spec["research"],
                    "strategy": spec["strategy"],
                    "concept": spec["concept"],
                    "outcome": spec["outcome"],
                    "colorPalette": json.dumps(spec["colorPalette"]),
                    "typography": json.dumps(spec["typography"]),
                    "applications": json.dumps(spec["applications"]),
                    "featured": spec["featured"],
                    "status": "PUBLISHED",
                    "publishAt": datetime(2020, 1, 1, tzinfo=dt_timezone.utc),
                    "order": spec["order"],
                    "viewCount": 40 + spec["order"] * 17,
                    "seoTitle": f"{spec['title']} — Case Study",
                    "seoDescription": spec["summary"][:320],
                },
            )
            for i, (img, alt, caption) in enumerate(spec.get("images") or []):
                ProjectImage.objects.get_or_create(
                    project=project, url=f"/uploads/demo/{img}",
                    defaults={"alt": alt, "caption": caption, "order": i},
                )

        # --- Services ---
        for order, (title, slug, short, deliverables, approach, icon, featured) in enumerate(SERVICES):
            Service.objects.get_or_create(
                slug=slug,
                defaults={
                    "title": title,
                    "shortDescription": short,
                    "description": f"{short} {approach}",
                    "deliverables": json.dumps(deliverables),
                    "approach": approach,
                    "icon": icon,
                    "order": order,
                    "featured": featured,
                    "status": "PUBLISHED",
                },
            )

        # --- Skills ---
        for order, (name, level) in enumerate(SKILLS_SOFTWARE):
            Skill.objects.get_or_create(name=name, category="SOFTWARE", defaults={"level": level, "order": order, "status": "PUBLISHED"})
        for order, (name, level) in enumerate(SKILLS_EXPERTISE):
            Skill.objects.get_or_create(name=name, category="EXPERTISE", defaults={"level": level, "order": order, "status": "PUBLISHED"})

        # --- Resume ---
        Experience.objects.get_or_create(company="Independent Studio", role="Senior Graphic Designer & Art Director", defaults={
            "description": "Running an independent practice for selected brand, editorial and 3D projects. Clients include technology, hospitality and culture.",
            "location": "London, UK", "startDate": date(2021, 2, 1), "current": True, "order": 0, "status": "PUBLISHED"})
        Experience.objects.get_or_create(company="Studio Kilo", role="Senior Designer", defaults={
            "description": "Led identity systems for hospitality and culture clients; built the studio's packaging practice.",
            "location": "London, UK", "startDate": date(2018, 4, 1), "endDate": date(2021, 1, 31), "order": 1, "status": "PUBLISHED"})
        Experience.objects.get_or_create(company="Norr Agency", role="Designer", defaults={
            "description": "Campaign and editorial design for Nordic consumer brands.",
            "location": "Stockholm, SE", "startDate": date(2015, 9, 1), "endDate": date(2018, 3, 31), "order": 2, "status": "PUBLISHED"})
        Experience.objects.get_or_create(company="Bright&Co", role="Junior Designer", defaults={
            "description": "First role — production design, print prep and endless logo resizing (character building).",
            "location": "Manchester, UK", "startDate": date(2013, 7, 1), "endDate": date(2015, 8, 31), "order": 3, "status": "PUBLISHED"})

        Education.objects.get_or_create(institution="Royal College of Art", degree="MA Visual Communication", defaults={
            "field": "Graphic Design", "startDate": date(2012, 9, 1), "endDate": date(2014, 6, 30), "order": 0, "status": "PUBLISHED"})
        Education.objects.get_or_create(institution="Central Saint Martins", degree="BA (Hons) Graphic Design", defaults={
            "field": "Graphic Design", "startDate": date(2009, 9, 1), "endDate": date(2012, 6, 30), "order": 1, "status": "PUBLISHED"})

        Certification.objects.get_or_create(name="Adobe Certified Expert — Illustrator", issuer="Adobe", defaults={"issueDate": date(2023, 5, 1), "order": 0, "status": "PUBLISHED"})
        Certification.objects.get_or_create(name="Google UX Design Certificate", issuer="Google", defaults={"issueDate": date(2022, 11, 1), "order": 1, "status": "PUBLISHED"})
        Certification.objects.get_or_create(name="Blender Foundation Certified Trainer", issuer="Blender Foundation", defaults={"issueDate": date(2024, 2, 1), "order": 2, "status": "PUBLISHED"})

        Achievement.objects.get_or_create(title="Awwwards — Site of the Day", organization="Awwwards", defaults={"description": "For the Nebula 3D portfolio experience.", "year": 2025, "order": 0, "status": "PUBLISHED"})
        Achievement.objects.get_or_create(title="D&AD Wood Pencil", organization="D&AD", defaults={"description": "Packaging design — Terra Botanicals range.", "year": 2025, "order": 1, "status": "PUBLISHED"})
        Achievement.objects.get_or_create(title="Behance Featured — Graphic Design", organization="Behance", defaults={"description": "Editorial work featured in the curated gallery.", "year": 2024, "order": 2, "status": "PUBLISHED"})
        Achievement.objects.get_or_create(title="Type Directors Club Certificate", organization="TDC", defaults={"description": "Typographic excellence — Noir poster series.", "year": 2024, "order": 3, "status": "PUBLISHED"})

        # --- Testimonials ---
        for order, (name, company, review, ref, rating, featured) in enumerate(TESTIMONIALS):
            Testimonial.objects.get_or_create(
                clientName=name, company=company,
                defaults={"review": review, "projectReference": ref, "rating": rating,
                          "date": date(2025, 9, 1), "published": True, "featured": featured, "order": order},
            )

        # --- Socials ---
        for order, (platform, label, url, icon) in enumerate(SOCIALS):
            SocialLink.objects.get_or_create(platform=platform, defaults={"label": label, "url": url, "icon": icon, "order": order, "visible": True})

        # --- Profile ---
        Profile.objects.get_or_create(
            name="Adrian Vale",
            defaults={
                "title": "Independent Graphic Designer & Art Director",
                "tagline": "Building brands, systems and sculptural visuals for teams with taste.",
                "shortBio": "I'm Adrian Vale — an independent graphic designer and art director working across identity, editorial and 3D. Nine years, sixty-plus clients, one obsession: design with intent.",
                "bio": "I run an independent design practice focused on brand identity, editorial systems and dimensional visuals.\n\nMy work sits at the intersection of systems thinking and craft: I build identities that scale, layouts that breathe and 3D visuals that carry a brand's voice. Past clients range from clean-energy startups to boutique hotel groups and film festivals.\n\nWhen I'm not pushing pixels I'm pushing vertices — the chrome sculpture series in this portfolio started as a weekend experiment and became the studio's signature.",
                "photoUrl": "/uploads/demo/portrait.png",
                "email": "hello@adrianvale.studio",
                "phone": "+44 20 7946 0000",
                "location": "London, United Kingdom",
                "availabilityStatus": "AVAILABLE",
                "availabilityNote": "Booking projects for next quarter",
                "yearsExperience": 9,
                "clientCount": 60,
                "projectCount": 120,
                "awardsCount": 7,
                "philosophyTitle": "Design with intent",
                "philosophy": "Every project starts with a question, not a moodboard. Strategy gives the work a spine; craft gives it a soul.",
                "interests": "Type design, generative art, brutalist architecture, long-distance cycling, film photography",
                "resumeUrl": "/uploads/cv/adrian-vale-cv.pdf",
            },
        )

        # --- Website settings (singleton) ---
        setting, _ = WebsiteSetting.objects.get_or_create(id="main")
        setting.siteName = "Adrian Vale"
        setting.logoText = "Adrian Vale®"
        setting.tagline = "Independent graphic designer & art director"
        setting.metaTitle = "Adrian Vale® — Graphic Designer & Art Director"
        setting.metaDescription = "Portfolio of Adrian Vale — brand identity, editorial design and 3D visuals for teams with taste."
        setting.metaKeywords = "graphic design, brand identity, art direction, 3D, editorial"
        setting.ogImageUrl = "/uploads/demo/og-image.png"
        setting.contactEmail = "hello@adrianvale.studio"
        setting.whatsappUrl = "https://wa.me/15550000000"
        setting.footerText = "Independent design practice — brand identity, editorial systems and dimensional visuals. Demo content throughout."
        setting.copyrightText = f"© {date.today().year} Adrian Vale. Demo portfolio."
        setting.cvUrl = "/uploads/cv/adrian-vale-cv.pdf"
        setting.accentColor = "#C6FF00"
        setting.hero3dEnabled = True
        setting.particlesEnabled = True
        setting.animationIntensity = 70
        setting.parallaxEnabled = True
        setting.smoothScrollEnabled = True
        setting.cursorEffectEnabled = True
        setting.save()

        # --- Theme (singleton) ---
        ThemeConfig.objects.get_or_create(id="theme")

        # --- Homepage sections (order = public layout) ---
        for order, (stype, order_val, title, subtitle, desc, config, bg) in enumerate(HOME_SECTIONS):
            HomepageSection.objects.get_or_create(
                sectionType=stype, order=order_val,
                defaults={"title": title, "subtitle": subtitle, "description": desc,
                          "config": config, "backgroundStyle": bg, "isVisible": True, "status": "PUBLISHED"},
            )

        # --- Navigation ---
        for order, (label, path) in enumerate(NAV_HEADER):
            NavigationItem.objects.get_or_create(label=label, position="HEADER", defaults={"path": path, "order": order})
        for order, (label, path) in enumerate(NAV_FOOTER):
            NavigationItem.objects.get_or_create(label=label, position="FOOTER", defaults={"path": path, "order": order})

        # --- Inquiries ---
        for name, email, company, ptype, budget, timeline, message, status, notes in INQUIRIES:
            ContactInquiry.objects.get_or_create(
                email=email, fullName=name,
                defaults={"company": company, "projectType": ptype, "budgetRange": budget,
                          "timeline": timeline, "message": message, "status": status, "adminNotes": notes},
            )

        self.stdout.write(self.style.SUCCESS(
            f"Seeded demo content. Admin login: {admin_email} / {admin_password} (change in production!)"
        ))
