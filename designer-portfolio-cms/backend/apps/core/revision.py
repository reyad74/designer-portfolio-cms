"""Snapshot + restore engine for the revision history requirement."""
import logging
from datetime import date, datetime
from decimal import Decimal

from apps.core.envelope import HttpError

logger = logging.getLogger("api")

# Primitive, restorable fields per tracked model (label = app.model)
REVISION_FIELDS = {
    "portfolio.project": [
        "title", "slug", "summary", "description", "categoryId", "clientName", "projectDate",
        "year", "tools", "thumbnailUrl", "coverUrl", "accentColor", "objectives", "challenges",
        "research", "strategy", "concept", "colorPalette", "typography", "applications",
        "outcome", "featured", "status", "publishAt", "order", "seoTitle", "seoDescription",
    ],
    "portfolio.projectcategory": ["name", "slug", "description", "order"],
    "cms.profile": [
        "name", "title", "tagline", "shortBio", "bio", "photoUrl", "email", "phone", "location",
        "availabilityStatus", "availabilityNote", "yearsExperience", "clientCount",
        "projectCount", "awardsCount", "philosophyTitle", "philosophy", "interests", "resumeUrl",
    ],
    "cms.service": [
        "title", "slug", "shortDescription", "description", "deliverables", "approach", "icon",
        "order", "featured", "status",
    ],
    "cms.testimonial": [
        "clientName", "company", "photoUrl", "review", "projectReference", "rating", "date",
        "published", "featured", "order",
    ],
    "cms.homepagesection": [
        "sectionType", "title", "subtitle", "description", "config", "backgroundUrl",
        "backgroundStyle", "order", "isVisible", "status",
    ],
    "cms.themeconfig": [
        "mode", "primaryColor", "backgroundColor", "surfaceColor", "cardColor", "textColor",
        "textMutedColor", "borderColor", "headingFont", "bodyFont", "editorialFont",
        "baseFontSize", "fontSizeScale", "borderRadius", "buttonStyle", "sectionSpacing",
        "cardStyle",
    ],
    "cms.websitesetting": [
        "siteName", "logoText", "logoUrl", "tagline", "metaTitle", "metaDescription",
        "metaKeywords", "ogImageUrl", "faviconUrl", "contactEmail", "whatsappUrl", "footerText",
        "copyrightText", "cvUrl", "accentColor", "hero3dEnabled", "particlesEnabled",
        "animationIntensity", "parallaxEnabled", "smoothScrollEnabled", "cursorEffectEnabled",
        "heroFallbackUrl",
    ],
}

TRACKED_ACTIONS = {"create", "update", "publish", "archive", "delete", "restore"}


def _jsonable(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def model_label(instance):
    return f"{instance._meta.app_label}.{instance._meta.model_name}"


def snapshot(instance):
    fields = REVISION_FIELDS.get(model_label(instance))
    if not fields:
        return {}
    return {f: _jsonable(getattr(instance, f, None)) for f in fields}


def record_revision(instance, action, admin, data=None):
    """Best-effort snapshot — must never break the main request flow."""
    try:
        label = model_label(instance)
        if label not in REVISION_FIELDS or action not in TRACKED_ACTIONS:
            return
        from apps.core.models import Revision

        Revision.objects.create(
            contentLabel=label,
            objectId=str(instance.pk),
            action=action,
            objectRepr=str(instance)[:200],
            data=data if data is not None else snapshot(instance),
            createdByName=getattr(admin, "name", "") or "system",
            createdByEmail=getattr(admin, "email", "") or "",
        )
    except Exception:
        logger.warning("Revision snapshot failed for %s", instance, exc_info=True)


TEXT_KINDS = ("CharField", "TextField", "SlugField", "EmailField", "URLField")


def _coerce(model, name, value):
    """Convert a JSON snapshot value back into the correct python type."""
    try:
        field = model._meta.get_field(name)
    except Exception:
        return None, False
    kind = field.get_internal_type()
    try:
        if value is None:
            return None, True
        if value == "":
            # Empty strings are valid for text fields; NULL for the rest.
            if kind in TEXT_KINDS:
                return "", True
            return None, True
        if kind == "BooleanField":
            if isinstance(value, bool):
                return value, True
            return str(value).lower() in ("true", "1", "yes"), True
        if kind in ("IntegerField", "PositiveIntegerField", "PositiveSmallIntegerField", "SmallIntegerField"):
            return int(value), True
        if kind == "DateField":
            return datetime.fromisoformat(str(value)).date(), True
        if kind == "DateTimeField":
            return datetime.fromisoformat(str(value)), True
    except (ValueError, TypeError):
        return None, False
    return value, True


def restore(revision, admin):
    """Restore an object to its snapshotted state (primitive fields only)."""
    from django.apps import apps as django_apps

    app, name = revision.contentLabel.split(".")
    model = django_apps.get_model(app, name)
    obj = model.objects.filter(pk=revision.objectId).first()
    if obj is None:
        raise HttpError("Original object no longer exists and cannot be restored", 400)

    for fname, value in (revision.data or {}).items():
        if fname in ("id", "createdAt", "updatedAt"):
            continue
        coerced, ok = _coerce(model, fname, value)
        if ok:
            setattr(obj, fname, coerced)
    try:
        obj.save()
    except Exception as exc:
        raise HttpError(
            f"Snapshot is incompatible with the current model — restore aborted ({type(exc).__name__})",
            400,
        )
    record_revision(obj, "restore", admin)
    return obj
