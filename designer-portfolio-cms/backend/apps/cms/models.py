from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Profile(TimeStampedModel):
    AVAILABILITY = [
        ("AVAILABLE", "Available"),
        ("LIMITED", "Limited"),
        ("UNAVAILABLE", "Unavailable"),
    ]

    name = models.CharField(max_length=120)
    title = models.CharField(max_length=160)
    tagline = models.CharField(max_length=300, blank=True, default="")
    shortBio = models.CharField(max_length=600)
    bio = models.TextField()
    photoUrl = models.CharField(max_length=500, blank=True, default="")
    email = models.CharField(max_length=200, blank=True, default="")
    phone = models.CharField(max_length=60, blank=True, default="")
    location = models.CharField(max_length=160, blank=True, default="")
    availabilityStatus = models.CharField(max_length=20, choices=AVAILABILITY, default="AVAILABLE")
    availabilityNote = models.CharField(max_length=200, blank=True, default="")
    yearsExperience = models.IntegerField(default=0)
    clientCount = models.IntegerField(default=0)
    projectCount = models.IntegerField(default=0)
    awardsCount = models.IntegerField(default=0)
    philosophyTitle = models.CharField(max_length=200, blank=True, default="")
    philosophy = models.TextField(blank=True, default="")
    interests = models.CharField(max_length=600, blank=True, default="")
    resumeUrl = models.CharField(max_length=500, blank=True, default="")

    def __str__(self):
        return self.name


class SocialLink(models.Model):
    platform = models.CharField(max_length=60)
    label = models.CharField(max_length=60)
    url = models.CharField(max_length=600)
    icon = models.CharField(max_length=60, blank=True, default="")
    order = models.IntegerField(default=0)
    visible = models.BooleanField(default=True)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.platform


class Service(TimeStampedModel):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    STATUSES = [(DRAFT, "Draft"), (PUBLISHED, "Published")]

    title = models.CharField(max_length=120)
    slug = models.SlugField(max_length=130, unique=True)
    shortDescription = models.CharField(max_length=300)
    description = models.TextField()
    deliverables = models.TextField(blank=True, default="")  # JSON string array
    approach = models.TextField(blank=True, default="")
    icon = models.CharField(max_length=60, blank=True, default="")
    order = models.IntegerField(default=0)
    featured = models.BooleanField(default=False)
    status = models.CharField(max_length=12, choices=STATUSES, default=PUBLISHED, db_index=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.title


class Skill(TimeStampedModel):
    SOFTWARE = "SOFTWARE"
    EXPERTISE = "EXPERTISE"
    CATEGORIES = [(SOFTWARE, "Software"), (EXPERTISE, "Expertise")]

    name = models.CharField(max_length=80)
    category = models.CharField(max_length=12, choices=CATEGORIES, db_index=True)
    level = models.PositiveSmallIntegerField(default=80)  # 0-100, admin-editable
    icon = models.CharField(max_length=60, blank=True, default="")
    order = models.IntegerField(default=0)
    status = models.CharField(max_length=12, choices=Service.STATUSES, default=Service.PUBLISHED)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.name} ({self.level})"


class Experience(TimeStampedModel):
    company = models.CharField(max_length=160)
    role = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    location = models.CharField(max_length=160, blank=True, default="")
    startDate = models.DateField()
    endDate = models.DateField(null=True, blank=True)
    current = models.BooleanField(default=False)
    order = models.IntegerField(default=0)
    status = models.CharField(max_length=12, choices=Service.STATUSES, default=Service.PUBLISHED)

    class Meta:
        ordering = ["order", "-startDate"]

    def __str__(self):
        return f"{self.role} @ {self.company}"


class Education(TimeStampedModel):
    institution = models.CharField(max_length=160)
    degree = models.CharField(max_length=160)
    field = models.CharField(max_length=160, blank=True, default="")
    description = models.TextField(blank=True, default="")
    startDate = models.DateField()
    endDate = models.DateField(null=True, blank=True)
    order = models.IntegerField(default=0)
    status = models.CharField(max_length=12, choices=Service.STATUSES, default=Service.PUBLISHED)

    class Meta:
        ordering = ["order", "-startDate"]

    def __str__(self):
        return f"{self.degree}, {self.institution}"


class Certification(TimeStampedModel):
    name = models.CharField(max_length=200)
    issuer = models.CharField(max_length=160)
    issueDate = models.DateField(null=True, blank=True)
    credentialUrl = models.CharField(max_length=600, blank=True, default="")
    description = models.CharField(max_length=600, blank=True, default="")
    order = models.IntegerField(default=0)
    status = models.CharField(max_length=12, choices=Service.STATUSES, default=Service.PUBLISHED)

    class Meta:
        ordering = ["order", "-issueDate"]

    def __str__(self):
        return self.name


class Achievement(TimeStampedModel):
    title = models.CharField(max_length=200)
    description = models.CharField(max_length=600, blank=True, default="")
    organization = models.CharField(max_length=160, blank=True, default="")
    year = models.IntegerField(null=True, blank=True)
    order = models.IntegerField(default=0)
    status = models.CharField(max_length=12, choices=Service.STATUSES, default=Service.PUBLISHED)

    class Meta:
        ordering = ["order", "-year"]

    def __str__(self):
        return self.title


class Testimonial(TimeStampedModel):
    clientName = models.CharField(max_length=120)
    company = models.CharField(max_length=160, blank=True, default="")
    photoUrl = models.CharField(max_length=500, blank=True, default="")
    review = models.TextField()
    projectReference = models.CharField(max_length=200, blank=True, default="")
    rating = models.PositiveSmallIntegerField(null=True, blank=True)  # 1-5
    date = models.DateField(null=True, blank=True)
    published = models.BooleanField(default=False, db_index=True)  # approval workflow
    featured = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["-featured", "order", "-date"]

    def __str__(self):
        return f"{self.clientName}"


class WebsiteSetting(models.Model):
    """Singleton (pk='main'). Includes 3D/animation feature flags."""

    id = models.CharField(max_length=20, primary_key=True, default="main")
    siteName = models.CharField(max_length=120, default="Portfolio")
    logoText = models.CharField(max_length=40, blank=True, default="")
    logoUrl = models.CharField(max_length=500, blank=True, default="")
    tagline = models.CharField(max_length=300, blank=True, default="")
    metaTitle = models.CharField(max_length=200, blank=True, default="")
    metaDescription = models.CharField(max_length=320, blank=True, default="")
    metaKeywords = models.CharField(max_length=500, blank=True, default="")
    ogImageUrl = models.CharField(max_length=500, blank=True, default="")
    faviconUrl = models.CharField(max_length=500, blank=True, default="")
    contactEmail = models.CharField(max_length=200, blank=True, default="")
    whatsappUrl = models.CharField(max_length=600, blank=True, default="")
    footerText = models.CharField(max_length=600, blank=True, default="")
    copyrightText = models.CharField(max_length=300, blank=True, default="")
    cvUrl = models.CharField(max_length=500, blank=True, default="")
    accentColor = models.CharField(max_length=20, default="#C6FF00")
    # --- 3D & animation settings (admin-configurable) ---
    hero3dEnabled = models.BooleanField(default=True)
    particlesEnabled = models.BooleanField(default=True)
    animationIntensity = models.PositiveSmallIntegerField(default=70)  # 0-100
    parallaxEnabled = models.BooleanField(default=True)
    smoothScrollEnabled = models.BooleanField(default=True)
    cursorEffectEnabled = models.BooleanField(default=True)
    heroFallbackUrl = models.CharField(max_length=500, blank=True, default="")
    updatedAt = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.siteName


class NavigationItem(models.Model):
    HEADER = "HEADER"
    FOOTER = "FOOTER"
    POSITIONS = [(HEADER, "Header"), (FOOTER, "Footer")]

    label = models.CharField(max_length=60)
    path = models.CharField(max_length=200)
    position = models.CharField(max_length=10, choices=POSITIONS, default=HEADER, db_index=True)
    order = models.IntegerField(default=0)
    isVisible = models.BooleanField(default=True)
    openInNew = models.BooleanField(default=False)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position", "order", "id"]

    def __str__(self):
        return f"{self.position}: {self.label}"


class ThemeConfig(models.Model):
    """Singleton (pk='theme'). Consumed by the frontend as CSS variables."""

    MODES = [("DARK", "Dark"), ("LIGHT", "Light")]
    FONTS = ["Space Grotesk", "Inter", "Playfair Display", "system-ui"]
    BUTTON_STYLES = [("sharp", "Sharp"), ("rounded", "Rounded"), ("pill", "Pill")]
    SPACING = [("compact", "Compact"), ("comfortable", "Comfortable"), ("spacious", "Spacious")]
    CARD_STYLES = [("flat", "Flat"), ("glass", "Glass"), ("outlined", "Outlined")]

    id = models.CharField(max_length=20, primary_key=True, default="theme")
    mode = models.CharField(max_length=6, choices=MODES, default="DARK")
    primaryColor = models.CharField(max_length=9, default="#C6FF00")
    backgroundColor = models.CharField(max_length=9, default="#080808")
    surfaceColor = models.CharField(max_length=9, default="#111111")
    cardColor = models.CharField(max_length=9, default="#171717")
    textColor = models.CharField(max_length=9, default="#FFFFFF")
    textMutedColor = models.CharField(max_length=9, default="#A1A1AA")
    borderColor = models.CharField(max_length=9, default="#292929")
    headingFont = models.CharField(max_length=40, default="Space Grotesk")
    bodyFont = models.CharField(max_length=40, default="Inter")
    editorialFont = models.CharField(max_length=40, default="Playfair Display")
    baseFontSize = models.PositiveSmallIntegerField(default=16)  # 12-24 px
    fontSizeScale = models.DecimalField(max_digits=3, decimal_places=2, default=1.00)
    borderRadius = models.PositiveSmallIntegerField(default=4)  # 0-24 px
    buttonStyle = models.CharField(max_length=10, choices=BUTTON_STYLES, default="sharp")
    sectionSpacing = models.CharField(max_length=12, choices=SPACING, default="comfortable")
    cardStyle = models.CharField(max_length=10, choices=CARD_STYLES, default="flat")
    updatedAt = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "Theme configuration"


class HomepageSection(TimeStampedModel):
    """THE homepage: order + visibility + status in this table IS the public layout."""

    TYPES = [
        ("hero", "Hero"),
        ("marquee", "Marquee"),
        ("featured_projects", "Featured Projects"),
        ("about_preview", "About Preview"),
        ("services_preview", "Services Preview"),
        ("skills_preview", "Skills Preview"),
        ("testimonials_preview", "Testimonials Preview"),
        ("experience_preview", "Experience Preview"),
        ("contact_cta", "Contact CTA"),
    ]
    BACKGROUNDS = [
        ("none", "None"),
        ("gradient", "Gradient"),
        ("noise", "Noise"),
        ("grid", "Grid"),
    ]

    sectionType = models.CharField(max_length=30, choices=TYPES)
    title = models.CharField(max_length=200, blank=True, default="")
    subtitle = models.CharField(max_length=200, blank=True, default="")
    description = models.TextField(blank=True, default="")
    config = models.JSONField(default=dict, blank=True)
    backgroundUrl = models.CharField(max_length=500, blank=True, default="")
    backgroundStyle = models.CharField(max_length=12, choices=BACKGROUNDS, default="none")
    order = models.IntegerField(default=0)
    isVisible = models.BooleanField(default=True)
    status = models.CharField(max_length=12, choices=Service.STATUSES, default=Service.PUBLISHED)
    updatedAt = models.DateTimeField(auto_now=True)
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"#{self.order} {self.get_sectionType_display()}"


class MediaAsset(models.Model):
    filename = models.CharField(max_length=200)
    originalName = models.CharField(max_length=200)
    url = models.CharField(max_length=500, db_index=True)
    mimeType = models.CharField(max_length=80)
    size = models.IntegerField()
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    alt = models.CharField(max_length=300, blank=True, default="")
    caption = models.CharField(max_length=500, blank=True, default="")
    folder = models.CharField(max_length=40, default="general", db_index=True)
    thumbUrl = models.CharField(max_length=500, blank=True, default="")
    uploadedBy = models.ForeignKey(
        "accounts.AdminUser", null=True, blank=True, on_delete=models.SET_NULL
    )
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-createdAt"]

    def __str__(self):
        return self.originalName

    @property
    def file_path(self):
        from pathlib import Path

        return Path(settings.UPLOAD_ROOT) / self.url.removeprefix("/uploads/")
