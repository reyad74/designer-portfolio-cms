import json
import re
from datetime import date, datetime

from rest_framework import serializers

from apps.portfolio.models import Project, ProjectCategory, ProjectImage

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def normalize_json_list(value):
    """Accept a JSON array, a JSON-array string, or a comma-separated string.
    Always returns a JSON array string (or empty string) — fixes the legacy
    admin-UI comma/JSON inconsistency at the API boundary."""
    if value is None:
        return ""
    if isinstance(value, list):
        return json.dumps([str(v).strip() for v in value if str(v).strip()], ensure_ascii=False)
    s = str(value).strip()
    if not s:
        return ""
    if s.startswith("["):
        try:
            parsed = json.loads(s)
            if isinstance(parsed, list):
                return json.dumps(
                    [str(v).strip() for v in parsed if str(v).strip()], ensure_ascii=False
                )
        except (ValueError, TypeError):
            pass
    return json.dumps([p.strip() for p in s.split(",") if p.strip()], ensure_ascii=False)


def normalize_palette(value):
    if value in (None, ""):
        return ""
    try:
        parsed = json.loads(value) if isinstance(value, str) else value
    except (ValueError, TypeError):
        raise serializers.ValidationError("colorPalette must be JSON: [{\"name\", \"hex\"}]")
    if not isinstance(parsed, list):
        raise serializers.ValidationError("colorPalette must be a list of {name, hex}")
    cleaned = []
    for entry in parsed:
        if isinstance(entry, dict) and entry.get("hex"):
            cleaned.append(
                {
                    "name": str(entry.get("name", "")).strip()[:60],
                    "hex": str(entry["hex"]).strip()[:20],
                }
            )
    return json.dumps(cleaned, ensure_ascii=False)


def parse_date_string(value):
    """Accepts 'YYYY-MM-DD' or full ISO datetime; returns date or None."""
    if value in (None, ""):
        return None
    s = str(value).strip().replace("Z", "+00:00")
    try:
        if "T" in s:
            return datetime.fromisoformat(s).date()
        return date.fromisoformat(s[:10])
    except ValueError:
        raise serializers.ValidationError("Invalid date. Use YYYY-MM-DD.")


def parse_datetime_string(value):
    if value in (None, ""):
        return None
    s = str(value).strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        raise serializers.ValidationError("Invalid datetime. Use ISO 8601.")
    if timezone_naive(dt):
        pass  # stored as naive UTC
    return dt


def timezone_naive(dt):
    return dt.tzinfo is None


class CategorySerializer(serializers.ModelSerializer):
    projectCount = serializers.SerializerMethodField()

    class Meta:
        model = ProjectCategory
        fields = ["id", "name", "slug", "description", "order", "projectCount", "createdAt", "updatedAt"]

    def get_projectCount(self, obj):
        if hasattr(obj, "published_count"):
            return obj.published_count
        return obj.projects.filter(status=Project.PUBLISHED).count()


class ProjectImageSerializer(serializers.ModelSerializer):
    projectId = serializers.IntegerField(source="project_id", read_only=True)

    class Meta:
        model = ProjectImage
        fields = ["id", "projectId", "url", "alt", "caption", "order", "createdAt"]


class ProjectSerializer(serializers.ModelSerializer):
    categoryId = serializers.IntegerField(source="category_id", read_only=True)
    category = CategorySerializer(read_only=True)
    imageCount = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "title", "slug", "summary", "description", "categoryId", "category",
            "clientName", "projectDate", "year", "tools", "thumbnailUrl", "coverUrl",
            "accentColor", "objectives", "challenges", "research", "strategy", "concept",
            "outcome", "colorPalette", "typography", "applications", "featured", "status",
            "publishAt", "order", "viewCount", "seoTitle", "seoDescription", "imageCount",
            "createdAt", "updatedAt",
        ]

    def get_imageCount(self, obj):
        return obj.images.count()


class ProjectWriteSerializer(serializers.Serializer):
    """Full-replace validation mirroring the legacy zod projectSchema."""

    title = serializers.CharField(min_length=2, max_length=160)
    slug = serializers.RegexField(SLUG_RE, min_length=2, max_length=160)
    summary = serializers.CharField(min_length=10, max_length=400)
    description = serializers.CharField(min_length=10)
    categoryId = serializers.IntegerField()
    clientName = serializers.CharField(max_length=160, required=False, allow_blank=True, default="")
    projectDate = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    tools = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    thumbnailUrl = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    coverUrl = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    accentColor = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    objectives = serializers.CharField(required=False, allow_blank=True, default="")
    challenges = serializers.CharField(required=False, allow_blank=True, default="")
    research = serializers.CharField(required=False, allow_blank=True, default="")
    strategy = serializers.CharField(required=False, allow_blank=True, default="")
    concept = serializers.CharField(required=False, allow_blank=True, default="")
    outcome = serializers.CharField(required=False, allow_blank=True, default="")
    colorPalette = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    typography = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    applications = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    featured = serializers.BooleanField(required=False, default=False)
    status = serializers.ChoiceField(choices=["DRAFT", "PUBLISHED", "ARCHIVED"], default="DRAFT")
    publishAt = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    order = serializers.IntegerField(required=False, default=0)
    seoTitle = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    seoDescription = serializers.CharField(max_length=320, required=False, allow_blank=True, default="")

    def validate_categoryId(self, value):
        from apps.core.envelope import HttpError

        if not ProjectCategory.objects.filter(id=value).exists():
            raise HttpError("Category not found", 400)
        return value

    def validate(self, attrs):
        attrs["tools"] = normalize_json_list(attrs.get("tools"))
        attrs["typography"] = normalize_json_list(attrs.get("typography"))
        attrs["applications"] = normalize_json_list(attrs.get("applications"))
        attrs["colorPalette"] = normalize_palette(attrs.get("colorPalette"))
        project_date = parse_date_string(attrs.get("projectDate"))
        attrs["projectDate"] = project_date
        attrs["year"] = project_date.year if project_date else None
        attrs["publishAt"] = parse_datetime_string(attrs.get("publishAt"))
        return attrs


class CategoryWriteSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=80)
    slug = serializers.RegexField(SLUG_RE, min_length=2, max_length=90)
    description = serializers.CharField(max_length=300, required=False, allow_blank=True, default="")
    order = serializers.IntegerField(required=False, default=0)
