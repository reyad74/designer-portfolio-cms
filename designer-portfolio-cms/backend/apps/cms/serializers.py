import re
from decimal import Decimal

from rest_framework import serializers

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
from apps.core.models import Revision
from apps.portfolio.serializers import SLUG_RE, normalize_json_list

HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


def _hex_validator(value):
    if not HEX_RE.match(value or ""):
        raise serializers.ValidationError("Invalid hex colour (expected #RRGGBB)")
    return value


def _parse_date(value):
    from apps.portfolio.serializers import parse_date_string

    return parse_date_string(value)


# ---------- Read serializers ----------

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            "id", "name", "title", "tagline", "shortBio", "bio", "photoUrl", "email", "phone",
            "location", "availabilityStatus", "availabilityNote", "yearsExperience",
            "clientCount", "projectCount", "awardsCount", "philosophyTitle", "philosophy",
            "interests", "resumeUrl", "createdAt", "updatedAt",
        ]


class SocialLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialLink
        fields = ["id", "platform", "label", "url", "icon", "order", "visible", "createdAt", "updatedAt"]


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = [
            "id", "title", "slug", "shortDescription", "description", "deliverables",
            "approach", "icon", "order", "featured", "status", "createdAt", "updatedAt",
        ]


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ["id", "name", "category", "level", "icon", "order", "status", "createdAt", "updatedAt"]


class ExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experience
        fields = [
            "id", "company", "role", "description", "location", "startDate", "endDate",
            "current", "order", "status", "createdAt", "updatedAt",
        ]


class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = [
            "id", "institution", "degree", "field", "description", "startDate", "endDate",
            "order", "status", "createdAt", "updatedAt",
        ]


class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = [
            "id", "name", "issuer", "issueDate", "credentialUrl", "description", "order",
            "status", "createdAt", "updatedAt",
        ]


class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = ["id", "title", "description", "organization", "year", "order", "status", "createdAt", "updatedAt"]


class TestimonialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = [
            "id", "clientName", "company", "photoUrl", "review", "projectReference", "rating",
            "date", "published", "featured", "order", "createdAt", "updatedAt",
        ]


class SettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsiteSetting
        fields = [
            "id", "siteName", "logoText", "logoUrl", "tagline", "metaTitle", "metaDescription",
            "metaKeywords", "ogImageUrl", "faviconUrl", "contactEmail", "whatsappUrl",
            "footerText", "copyrightText", "cvUrl", "accentColor", "hero3dEnabled",
            "particlesEnabled", "animationIntensity", "parallaxEnabled", "smoothScrollEnabled",
            "cursorEffectEnabled", "heroFallbackUrl", "updatedAt",
        ]


class ThemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThemeConfig
        fields = [
            "id", "mode", "primaryColor", "backgroundColor", "surfaceColor", "cardColor",
            "textColor", "textMutedColor", "borderColor", "headingFont", "bodyFont",
            "editorialFont", "baseFontSize", "fontSizeScale", "borderRadius", "buttonStyle",
            "sectionSpacing", "cardStyle", "updatedAt",
        ]


class NavigationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = NavigationItem
        fields = ["id", "label", "path", "position", "order", "isVisible", "openInNew", "createdAt", "updatedAt"]


class HomepageSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomepageSection
        fields = [
            "id", "sectionType", "title", "subtitle", "description", "config", "backgroundUrl",
            "backgroundStyle", "order", "isVisible", "status", "createdAt", "updatedAt",
        ]


class MediaAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaAsset
        fields = [
            "id", "filename", "originalName", "url", "mimeType", "size", "width", "height",
            "alt", "caption", "folder", "thumbUrl", "createdAt",
        ]


class RevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Revision
        fields = [
            "id", "contentLabel", "objectId", "action", "objectRepr", "data",
            "createdByName", "createdByEmail", "createdAt",
        ]


# ---------- Write serializers ----------

class ProfileWriteSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=120)
    title = serializers.CharField(min_length=2, max_length=160)
    tagline = serializers.CharField(max_length=300, required=False, allow_blank=True, default="")
    shortBio = serializers.CharField(min_length=10, max_length=600)
    bio = serializers.CharField(min_length=10, max_length=8000)
    photoUrl = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    email = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    phone = serializers.CharField(max_length=60, required=False, allow_blank=True, default="")
    location = serializers.CharField(max_length=160, required=False, allow_blank=True, default="")
    availabilityStatus = serializers.ChoiceField(
        choices=["AVAILABLE", "LIMITED", "UNAVAILABLE"], required=False, default="AVAILABLE"
    )
    availabilityNote = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    yearsExperience = serializers.IntegerField(required=False, default=0, min_value=0, max_value=80)
    clientCount = serializers.IntegerField(required=False, default=0, min_value=0, max_value=100000)
    projectCount = serializers.IntegerField(required=False, default=0, min_value=0, max_value=100000)
    awardsCount = serializers.IntegerField(required=False, default=0, min_value=0, max_value=10000)
    philosophyTitle = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    philosophy = serializers.CharField(max_length=3000, required=False, allow_blank=True, default="")
    interests = serializers.CharField(max_length=600, required=False, allow_blank=True, default="")
    resumeUrl = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")


class SocialLinkWriteSerializer(serializers.Serializer):
    platform = serializers.CharField(min_length=1, max_length=60)
    label = serializers.CharField(min_length=1, max_length=60)
    url = serializers.CharField(min_length=1, max_length=600)
    icon = serializers.CharField(max_length=60, required=False, allow_blank=True, default="")
    order = serializers.IntegerField(required=False, default=0)
    visible = serializers.BooleanField(required=False, default=True)


class ServiceWriteSerializer(serializers.Serializer):
    title = serializers.CharField(min_length=2, max_length=120)
    slug = serializers.RegexField(SLUG_RE, min_length=2, max_length=130)
    shortDescription = serializers.CharField(min_length=10, max_length=300)
    description = serializers.CharField(min_length=10)
    deliverables = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    approach = serializers.CharField(max_length=1500, required=False, allow_blank=True, default="")
    icon = serializers.CharField(max_length=60, required=False, allow_blank=True, default="")
    order = serializers.IntegerField(required=False, default=0)
    featured = serializers.BooleanField(required=False, default=False)
    status = serializers.ChoiceField(choices=["DRAFT", "PUBLISHED"], required=False, default="PUBLISHED")

    def validate_deliverables(self, value):
        return normalize_json_list(value)


class SkillWriteSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=1, max_length=80)
    category = serializers.ChoiceField(choices=["SOFTWARE", "EXPERTISE"])
    level = serializers.IntegerField(required=False, default=80, min_value=0, max_value=100)
    icon = serializers.CharField(max_length=60, required=False, allow_blank=True, default="")
    order = serializers.IntegerField(required=False, default=0)
    status = serializers.ChoiceField(choices=["DRAFT", "PUBLISHED"], required=False, default="PUBLISHED")


class ExperienceWriteSerializer(serializers.Serializer):
    company = serializers.CharField(min_length=1, max_length=160)
    role = serializers.CharField(min_length=1, max_length=120)
    description = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")
    location = serializers.CharField(max_length=160, required=False, allow_blank=True, default="")
    startDate = serializers.CharField()
    endDate = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    current = serializers.BooleanField(required=False, default=False)
    order = serializers.IntegerField(required=False, default=0)
    status = serializers.ChoiceField(choices=["DRAFT", "PUBLISHED"], required=False, default="PUBLISHED")

    def validate_startDate(self, value):
        return _parse_date(value)

    def validate_endDate(self, value):
        return _parse_date(value)


class EducationWriteSerializer(serializers.Serializer):
    institution = serializers.CharField(min_length=1, max_length=160)
    degree = serializers.CharField(min_length=1, max_length=160)
    field = serializers.CharField(max_length=160, required=False, allow_blank=True, default="")
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")
    startDate = serializers.CharField()
    endDate = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    order = serializers.IntegerField(required=False, default=0)
    status = serializers.ChoiceField(choices=["DRAFT", "PUBLISHED"], required=False, default="PUBLISHED")

    def validate_startDate(self, value):
        return _parse_date(value)

    def validate_endDate(self, value):
        return _parse_date(value)


class CertificationWriteSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=1, max_length=200)
    issuer = serializers.CharField(min_length=1, max_length=160)
    issueDate = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    credentialUrl = serializers.CharField(max_length=600, required=False, allow_blank=True, default="")
    description = serializers.CharField(max_length=600, required=False, allow_blank=True, default="")
    order = serializers.IntegerField(required=False, default=0)
    status = serializers.ChoiceField(choices=["DRAFT", "PUBLISHED"], required=False, default="PUBLISHED")

    def validate_issueDate(self, value):
        return _parse_date(value)


class AchievementWriteSerializer(serializers.Serializer):
    title = serializers.CharField(min_length=1, max_length=200)
    description = serializers.CharField(max_length=600, required=False, allow_blank=True, default="")
    organization = serializers.CharField(max_length=160, required=False, allow_blank=True, default="")
    year = serializers.IntegerField(required=False, allow_null=True, default=None, min_value=1900, max_value=2100)
    order = serializers.IntegerField(required=False, default=0)
    status = serializers.ChoiceField(choices=["DRAFT", "PUBLISHED"], required=False, default="PUBLISHED")


class TestimonialWriteSerializer(serializers.Serializer):
    clientName = serializers.CharField(min_length=2, max_length=120)
    company = serializers.CharField(max_length=160, required=False, allow_blank=True, default="")
    photoUrl = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    review = serializers.CharField(min_length=10, max_length=1500)
    projectReference = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    rating = serializers.IntegerField(required=False, allow_null=True, default=None, min_value=1, max_value=5)
    date = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    published = serializers.BooleanField(required=False, default=False)
    featured = serializers.BooleanField(required=False, default=False)
    order = serializers.IntegerField(required=False, default=0)

    def validate_date(self, value):
        return _parse_date(value)


class SettingsWriteSerializer(serializers.Serializer):
    siteName = serializers.CharField(min_length=2, max_length=120)
    logoText = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    logoUrl = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    tagline = serializers.CharField(max_length=300, required=False, allow_blank=True, default="")
    metaTitle = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    metaDescription = serializers.CharField(max_length=320, required=False, allow_blank=True, default="")
    metaKeywords = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    ogImageUrl = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    faviconUrl = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    contactEmail = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    whatsappUrl = serializers.CharField(max_length=600, required=False, allow_blank=True, default="")
    footerText = serializers.CharField(max_length=600, required=False, allow_blank=True, default="")
    copyrightText = serializers.CharField(max_length=300, required=False, allow_blank=True, default="")
    cvUrl = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    accentColor = serializers.CharField(max_length=20, required=False, default="#C6FF00")
    hero3dEnabled = serializers.BooleanField(required=False, default=True)
    particlesEnabled = serializers.BooleanField(required=False, default=True)
    animationIntensity = serializers.IntegerField(required=False, default=70, min_value=0, max_value=100)
    parallaxEnabled = serializers.BooleanField(required=False, default=True)
    smoothScrollEnabled = serializers.BooleanField(required=False, default=True)
    cursorEffectEnabled = serializers.BooleanField(required=False, default=True)
    heroFallbackUrl = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")


class ThemeWriteSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=["DARK", "LIGHT"], required=False)
    primaryColor = serializers.CharField(required=False)
    backgroundColor = serializers.CharField(required=False)
    surfaceColor = serializers.CharField(required=False)
    cardColor = serializers.CharField(required=False)
    textColor = serializers.CharField(required=False)
    textMutedColor = serializers.CharField(required=False)
    borderColor = serializers.CharField(required=False)
    headingFont = serializers.ChoiceField(
        choices=["Space Grotesk", "Inter", "Playfair Display", "system-ui"], required=False
    )
    bodyFont = serializers.ChoiceField(
        choices=["Space Grotesk", "Inter", "Playfair Display", "system-ui"], required=False
    )
    editorialFont = serializers.ChoiceField(
        choices=["Space Grotesk", "Inter", "Playfair Display", "system-ui"], required=False
    )
    baseFontSize = serializers.IntegerField(required=False, min_value=12, max_value=24)
    fontSizeScale = serializers.DecimalField(
        required=False, max_digits=3, decimal_places=2,
        min_value=Decimal("0.80"), max_value=Decimal("1.40"),
    )
    borderRadius = serializers.IntegerField(required=False, min_value=0, max_value=24)
    buttonStyle = serializers.ChoiceField(choices=["sharp", "rounded", "pill"], required=False)
    sectionSpacing = serializers.ChoiceField(choices=["compact", "comfortable", "spacious"], required=False)
    cardStyle = serializers.ChoiceField(choices=["flat", "glass", "outlined"], required=False)

    def validate_primaryColor(self, v):
        return _hex_validator(v)

    def validate_backgroundColor(self, v):
        return _hex_validator(v)

    def validate_surfaceColor(self, v):
        return _hex_validator(v)

    def validate_cardColor(self, v):
        return _hex_validator(v)

    def validate_textColor(self, v):
        return _hex_validator(v)

    def validate_textMutedColor(self, v):
        return _hex_validator(v)

    def validate_borderColor(self, v):
        return _hex_validator(v)


class NavigationWriteSerializer(serializers.Serializer):
    label = serializers.CharField(min_length=1, max_length=60)
    path = serializers.CharField(min_length=1, max_length=200)
    position = serializers.ChoiceField(choices=["HEADER", "FOOTER"], required=False, default="HEADER")
    order = serializers.IntegerField(required=False)
    isVisible = serializers.BooleanField(required=False, default=True)
    openInNew = serializers.BooleanField(required=False, default=False)


class SectionWriteSerializer(serializers.Serializer):
    sectionType = serializers.ChoiceField(choices=[t[0] for t in HomepageSection.TYPES])
    title = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    subtitle = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    description = serializers.CharField(required=False, allow_blank=True, default="")
    config = serializers.JSONField(required=False, default=dict)
    backgroundUrl = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    backgroundStyle = serializers.ChoiceField(
        choices=[b[0] for b in HomepageSection.BACKGROUNDS], required=False, default="none"
    )
    order = serializers.IntegerField(required=False)
    isVisible = serializers.BooleanField(required=False, default=True)
    status = serializers.ChoiceField(choices=["DRAFT", "PUBLISHED"], required=False, default="DRAFT")

    def validate_config(self, value):
        if value in (None, ""):
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("config must be a JSON object")
        return value
