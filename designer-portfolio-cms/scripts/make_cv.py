"""Generate the demo CV PDF for the portfolio site (clearly sample data)."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT

OUT = "/home/z/my-project/public/uploads/cv/adrian-vale-cv.pdf"

# Register fonts
fm = "/usr/share/fonts/truetype/chinese"
reg_candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    os.path.join(fm, "NotoSansSC-Regular.ttf"),
]
bold_candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    os.path.join(fm, "NotoSansSC-Bold.ttf"),
]

def pick(cands):
    for c in cands:
        if os.path.exists(c):
            return c
    raise RuntimeError("no font found")

FONT_REG = pick(reg_candidates)
FONT_BOLD = pick(bold_candidates)
pdfmetrics.registerFont(TTFont("Body", FONT_REG))
pdfmetrics.registerFont(TTFont("BodyBold", FONT_BOLD))

INK = HexColor("#111111")
MUTED = HexColor("#666666")
LIME = HexColor("#5a6b00")

body = ParagraphStyle("body", fontName="Body", fontSize=9.5, leading=13.5, textColor=INK, alignment=TA_LEFT)
muted = ParagraphStyle("muted", fontName="Body", fontSize=8.5, leading=12, textColor=MUTED)
h1 = ParagraphStyle("h1", fontName="BodyBold", fontSize=26, leading=30, textColor=INK)
h2 = ParagraphStyle("h2", fontName="BodyBold", fontSize=10.5, leading=14, textColor=LIME, spaceBefore=10, spaceAfter=4)
item_title = ParagraphStyle("it", fontName="BodyBold", fontSize=9.5, leading=13, textColor=INK)

from reportlab.platypus import SimpleDocTemplate

doc = SimpleDocTemplate(
    OUT, pagesize=A4,
    leftMargin=18*mm, rightMargin=18*mm, topMargin=16*mm, bottomMargin=16*mm,
    title="Adrian Vale — CV (Demo)", author="Adrian Vale",
)

story = []
story.append(Paragraph("ADRIAN VALE", h1))
story.append(Spacer(1, 2))
story.append(Paragraph("Graphic Designer &amp; Art Director — Berlin, Germany", muted))
story.append(Paragraph("hello@adrianvale.studio · adrianvale.studio · +49 30 0000 0000", muted))
story.append(Spacer(1, 6))
story.append(Paragraph(
    "Independent design practice specialising in brand identity, packaging and editorial systems. "
    "Nine years across studios in Berlin and Amsterdam, with work awarded by D&amp;AD and the European Design Awards. "
    "<i>(Demo CV generated with sample content.)</i>", body))

def entry(title, meta, desc=None):
    rows = [[Paragraph(title, item_title)], [Paragraph(meta, muted)]]
    if desc:
        rows.append([Paragraph(desc, body)])
    t = Table(rows, colWidths=[174*mm])
    t.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    story.append(t)
    story.append(Spacer(1, 5))

story.append(Paragraph("EXPERIENCE", h2))
entry("Founder & Design Director — Adrian Vale Studio", "Berlin · Jan 2024 – Present",
      "Independent practice: brand identity, packaging and editorial systems for clients across Europe and North America.")
entry("Lead Brand Designer — NORDWERK Agency", "Berlin · Mar 2022 – Dec 2023",
      "Identity programs for industrial and cultural clients; design-system methodology; mentored a team of four.")
entry("Art Director — FIELD & FORM", "Amsterdam · Jun 2019 – Feb 2022",
      "Packaging and campaign art direction for FMCG and lifestyle accounts; two nationally awarded projects.")
entry("Senior Graphic Designer — Studio Mono", "Berlin · Sep 2016 – May 2019",
      "Identity and editorial design for publishing and architecture clients.")

story.append(Paragraph("EDUCATION", h2))
entry("BA Communication Design — University of the Arts, Berlin", "2013 – 2017",
      "Thesis on typographic systems in public signage, awarded with distinction.")
entry("Exchange Semester — Design Academy Eindhoven", "2016", "Man &amp; Identity track.")

story.append(Paragraph("CERTIFICATIONS", h2))
entry("Adobe Certified Professional — Visual Design", "Adobe · 2021")
entry("Google UX Design Certificate", "Google · 2022")
entry("Type@Cooper Extended Program (Condensed)", "2019")

story.append(Paragraph("SELECTED RECOGNITION", h2))
entry("D&AD Wood Pencil — Brand Identity", "2023 · LUMEN Coffee Roasters")
entry("European Design Award, Packaging (Silver)", "2024 · TERRA Botanicals")
entry("Behance Featured — Graphic Design", "2022 · NOIR poster series")
entry("ADC Germany Merit Award", "2021 · ATLAS Quarterly")

story.append(Paragraph("TOOLKIT", h2))
story.append(Paragraph(
    "Illustrator · InDesign · Photoshop · After Effects · Figma · Blender · Cinema 4D · "
    "Expertise: visual identity, typography, colour theory, layout, creative direction, brand strategy.",
    body))

doc.build(story)
print("CV written:", OUT, os.path.getsize(OUT), "bytes")
