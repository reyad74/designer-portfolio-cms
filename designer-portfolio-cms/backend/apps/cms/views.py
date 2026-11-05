import re
import secrets
import shutil
import time
from pathlib import Path

from django.conf import settings
from django.db.models import Max, Q
from django.utils import timezone
from rest_framework.views import APIView

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
from apps.cms.serializers import (
    AchievementSerializer,
    AchievementWriteSerializer,
    CertificationSerializer,
    CertificationWriteSerializer,
    EducationSerializer,
    EducationWriteSerializer,
    ExperienceSerializer,
    ExperienceWriteSerializer,
    HomepageSectionSerializer,
    MediaAssetSerializer,
    NavigationItemSerializer,
    NavigationWriteSerializer,
    ProfileSerializer,
    ProfileWriteSerializer,
    RevisionSerializer,
    SectionWriteSerializer,
    ServiceSerializer,
    ServiceWriteSerializer,
    SettingsSerializer,
    SettingsWriteSerializer,
    SkillSerializer,
    SkillWriteSerializer,
    SocialLinkSerializer,
    SocialLinkWriteSerializer,
    TestimonialSerializer,
    TestimonialWriteSerializer,
    ThemeSerializer,
    ThemeWriteSerializer,
)
from apps.core.auth import require_admin
from apps.core.envelope import HttpError, fail, success
from apps.core.pagination import paginate
from apps.core.revision import record_revision, restore as restore_revision
from apps.portfolio.models import Project
from apps.portfolio.serializers import ProjectSerializer

FOLDER_RE = re.compile(r"[^a-z0-9_-]")


def _sanitize_folder(folder):
    cleaned = FOLDER_RE.sub("", str(folder or "").lower())[:40]
    return cleaned or "general"


# ============================ PUBLIC ============================


class PublicProfileView(APIView):
    def get(self, request):
        profile = Profile.objects.first()
        socials = SocialLink.objects.filter(visible=True).order_by("order", "id")
        return success(
            {
                "profile": ProfileSerializer(profile).data if profile else None,
                "socialLinks": SocialLinkSerializer(socials, many=True).data,
            }
        )


class PublicSettingsView(APIView):
    def get(self, request):
        setting, _ = WebsiteSetting.objects.get_or_create(id="main")
        return success(SettingsSerializer(setting).data)


class PublicThemeView(APIView):
    def get(self, request):
        theme, _ = ThemeConfig.objects.get_or_create(id="theme")
        return success(ThemeSerializer(theme).data)


class PublicNavigationView(APIView):
    def get(self, request):
        items = NavigationItem.objects.filter(isVisible=True).order_by("position", "order", "id")
        return success(
            {
                "header": NavigationItemSerializer(
                    [i for i in items if i.position == "HEADER"], many=True
                ).data,
                "footer": NavigationItemSerializer(
                    [i for i in items if i.position == "FOOTER"], many=True
                ).data,
            }
        )


def _resolve_sections(sections, include_unpublished_projects=False):
    """Attach resolved content (e.g. featured project cards) to section rows."""
    data = []
    for section in sections:
        item = HomepageSectionSerializer(section).data
        if section.sectionType == "featured_projects":
            cfg = section.config if isinstance(section.config, dict) else {}
            try:
                limit = max(1, min(int(cfg.get("limit", 4) or 4), 12))
            except (TypeError, ValueError):
                limit = 4
            base = Project.objects.all() if include_unpublished_projects else Project.public_queryset()
            if str(cfg.get("mode", "auto")).lower() == "manual":
                ids = [int(i) for i in (cfg.get("projectIds") or []) if str(i).strip().lstrip("-").isdigit()]
                by_id = {p.id: p for p in base.filter(id__in=ids).select_related("category")}
                ordered = [by_id[i] for i in ids if i in by_id][:limit]
            else:
                ordered = list(
                    base.filter(featured=True)
                    .select_related("category")
                    .order_by("order", "-projectDate")[:limit]
                )
            item["projects"] = ProjectSerializer(ordered, many=True).data
        data.append(item)
    return data


class PublicHomepageView(APIView):
    def get(self, request):
        sections = HomepageSection.objects.filter(
            status="PUBLISHED", isVisible=True
        ).order_by("order", "id")
        return success(_resolve_sections(sections))


class PublicServicesView(APIView):
    def get(self, request):
        services = Service.objects.filter(status="PUBLISHED").order_by("order", "id")
        return success(ServiceSerializer(services, many=True).data)


class PublicSkillsView(APIView):
    def get(self, request):
        skills = Skill.objects.filter(status="PUBLISHED").order_by("order", "id")
        return success(SkillSerializer(skills, many=True).data)


class PublicResumeView(APIView):
    def get(self, request):
        return success(
            {
                "experiences": ExperienceSerializer(
                    Experience.objects.filter(status="PUBLISHED").order_by("-current", "-startDate"),
                    many=True,
                ).data,
                "education": EducationSerializer(
                    Education.objects.filter(status="PUBLISHED").order_by("-startDate"),
                    many=True,
                ).data,
                "certifications": CertificationSerializer(
                    Certification.objects.filter(status="PUBLISHED").order_by("-issueDate"),
                    many=True,
                ).data,
                "achievements": AchievementSerializer(
                    Achievement.objects.filter(status="PUBLISHED").order_by("-year"),
                    many=True,
                ).data,
            }
        )


class PublicTestimonialsView(APIView):
    def get(self, request):
        testimonials = Testimonial.objects.filter(published=True).order_by("-featured", "order", "-date")
        return success(TestimonialSerializer(testimonials, many=True).data)


# ============================ ADMIN: PROFILE / SETTINGS / THEME ============================


class AdminProfileView(APIView):
    @require_admin
    def get(self, request):
        profile = Profile.objects.first()
        if profile is None:
            raise HttpError("Profile not found", 404)
        return success(ProfileSerializer(profile).data)

    @require_admin
    def patch(self, request):
        profile = Profile.objects.first()
        if profile is None:
            raise HttpError("Profile not found", 404)
        serializer = ProfileWriteSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(profile, field, value)
        profile.save()
        record_revision(profile, "update", request.admin_obj)
        return success(ProfileSerializer(profile).data)


class AdminSettingsView(APIView):
    @require_admin
    def get(self, request):
        setting, _ = WebsiteSetting.objects.get_or_create(id="main")
        return success(SettingsSerializer(setting).data)

    @require_admin
    def patch(self, request):
        setting, _ = WebsiteSetting.objects.get_or_create(id="main")
        serializer = SettingsWriteSerializer(setting, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(setting, field, value)
        setting.save()
        record_revision(setting, "update", request.admin_obj)
        return success(SettingsSerializer(setting).data)


class AdminThemeView(APIView):
    @require_admin
    def get(self, request):
        theme, _ = ThemeConfig.objects.get_or_create(id="theme")
        return success(ThemeSerializer(theme).data)

    @require_admin
    def patch(self, request):
        theme, _ = ThemeConfig.objects.get_or_create(id="theme")
        serializer = ThemeWriteSerializer(theme, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(theme, field, value)
        theme.save()
        record_revision(theme, "update", request.admin_obj)
        return success(ThemeSerializer(theme).data)


# ============================ ADMIN: HOMEPAGE BUILDER ============================


class AdminSectionsView(APIView):
    @require_admin
    def get(self, request):
        sections = HomepageSection.objects.all().order_by("order", "id")
        return success(_resolve_sections(sections, include_unpublished_projects=True))

    @require_admin
    def post(self, request):
        serializer = SectionWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        if payload.get("order") is None:
            max_order = HomepageSection.objects.aggregate(m=Max("order"))["m"]
            payload["order"] = (max_order + 1) if max_order is not None else 1
        section = HomepageSection.objects.create(**payload)
        record_revision(section, "create", request.admin_obj)
        return success(HomepageSectionSerializer(section).data, 201)


class AdminSectionDetailView(APIView):
    def _get(self, pk):
        section = HomepageSection.objects.filter(pk=pk).first()
        if section is None:
            raise HttpError("Not found", 404)
        return section

    @require_admin
    def get(self, request, pk):
        return success(HomepageSectionSerializer(self._get(pk)).data)

    @require_admin
    def patch(self, request, pk):
        section = self._get(pk)
        serializer = SectionWriteSerializer(section, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(section, field, value)
        section.save()
        record_revision(section, "update", request.admin_obj)
        return success(HomepageSectionSerializer(section).data)

    @require_admin
    def delete(self, request, pk):
        section = self._get(pk)
        record_revision(section, "delete", request.admin_obj)
        section.delete()
        return success({"deleted": True})


class AdminSectionsReorderView(APIView):
    @require_admin
    def post(self, request):
        order = request.data.get("order") if isinstance(request.data, dict) else None
        if not isinstance(order, list):
            raise HttpError("Body must be {\"order\": [<sectionId>, ...]}", 422)
        for index, section_id in enumerate(order):
            HomepageSection.objects.filter(id=section_id).update(order=index)
        sections = HomepageSection.objects.all().order_by("order", "id")
        return success(HomepageSectionSerializer(sections, many=True).data)


# ============================ ADMIN: NAVIGATION ============================


class AdminNavigationListView(APIView):
    @require_admin
    def get(self, request):
        items = NavigationItem.objects.order_by("position", "order", "id")
        return success(NavigationItemSerializer(items, many=True).data)

    @require_admin
    def post(self, request):
        serializer = NavigationWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        if payload.get("order") is None:
            max_order = NavigationItem.objects.filter(position=payload["position"]).aggregate(
                m=Max("order")
            )["m"]
            payload["order"] = (max_order + 1) if max_order is not None else 1
        item = NavigationItem.objects.create(**payload)
        return success(NavigationItemSerializer(item).data, 201)


class AdminNavigationDetailView(APIView):
    def _get(self, pk):
        item = NavigationItem.objects.filter(pk=pk).first()
        if item is None:
            raise HttpError("Not found", 404)
        return item

    @require_admin
    def patch(self, request, pk):
        item = self._get(pk)
        serializer = NavigationWriteSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(item, field, value)
        item.save()
        return success(NavigationItemSerializer(item).data)

    @require_admin
    def delete(self, request, pk):
        item = self._get(pk)
        item.delete()
        return success({"deleted": True})


class AdminNavigationReorderView(APIView):
    @require_admin
    def post(self, request):
        order = request.data.get("order") if isinstance(request.data, dict) else None
        if not isinstance(order, list):
            raise HttpError("Body must be {\"order\": [<itemId>, ...]}", 422)
        for index, item_id in enumerate(order):
            NavigationItem.objects.filter(id=item_id).update(order=index)
        items = NavigationItem.objects.order_by("position", "order", "id")
        return success(NavigationItemSerializer(items, many=True).data)


# ============================ ADMIN: GENERIC CRUD ============================


def _crud_views(model, write_serializer, read_serializer, list_order=("order", "id"), unique_slug=False):
    class ListView(APIView):
        @require_admin
        def get(self, request):
            qs = model.objects.order_by(*list_order)
            return success(read_serializer(qs, many=True).data)

        @require_admin
        def post(self, request):
            serializer = write_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            payload = dict(serializer.validated_data)
            if unique_slug and model.objects.filter(slug=payload.get("slug")).exists():
                raise HttpError("Slug already in use", 409)
            if model is Testimonial and not payload.get("date"):
                payload["date"] = timezone.now().date()
            obj = model.objects.create(**payload)
            record_revision(obj, "create", request.admin_obj)
            return success(read_serializer(obj).data, 201)

    class DetailView(APIView):
        def _get(self, pk):
            obj = model.objects.filter(pk=pk).first()
            if obj is None:
                raise HttpError("Not found", 404)
            return obj

        @require_admin
        def get(self, request, pk):
            return success(read_serializer(self._get(pk)).data)

        @require_admin
        def patch(self, request, pk):
            obj = self._get(pk)
            serializer = write_serializer(obj, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            payload = dict(serializer.validated_data)
            if unique_slug and model.objects.filter(slug=payload.get("slug")).exclude(pk=obj.pk).exists():
                raise HttpError("Slug already in use", 409)
            for field, value in payload.items():
                setattr(obj, field, value)
            obj.save()
            record_revision(obj, "update", request.admin_obj)
            return success(read_serializer(obj).data)

        @require_admin
        def delete(self, request, pk):
            obj = self._get(pk)
            record_revision(obj, "delete", request.admin_obj)
            obj.delete()
            return success({"deleted": True})

    return ListView, DetailView


ServiceList, ServiceDetail = _crud_views(Service, ServiceWriteSerializer, ServiceSerializer, unique_slug=True)
SkillList, SkillDetail = _crud_views(Skill, SkillWriteSerializer, SkillSerializer)
ExperienceList, ExperienceDetail = _crud_views(
    Experience, ExperienceWriteSerializer, ExperienceSerializer, list_order=("order", "-startDate", "id")
)
EducationList, EducationDetail = _crud_views(
    Education, EducationWriteSerializer, EducationSerializer, list_order=("order", "-startDate", "id")
)
CertificationList, CertificationDetail = _crud_views(
    Certification, CertificationWriteSerializer, CertificationSerializer, list_order=("order", "-issueDate", "id")
)
AchievementList, AchievementDetail = _crud_views(
    Achievement, AchievementWriteSerializer, AchievementSerializer, list_order=("order", "-year", "id")
)
TestimonialList, TestimonialDetail = _crud_views(
    Testimonial, TestimonialWriteSerializer, TestimonialSerializer, list_order=("-featured", "order", "-date", "id")
)
SocialList, SocialDetail = _crud_views(SocialLink, SocialLinkWriteSerializer, SocialLinkSerializer)


# ============================ ADMIN: MEDIA LIBRARY ============================

MAGIC_SIGNATURES = [
    (b"\xff\xd8\xff", "image/jpeg", ".jpg"),
    (b"\x89PNG", "image/png", ".png"),
    (b"GIF8", "image/gif", ".gif"),
]

ALLOWED_MESSAGE = "Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, SVG (max 5 MB)"


def _detect_mime(head):
    for magic, mime, ext in MAGIC_SIGNATURES:
        if head.startswith(magic):
            return mime, ext
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp", ".webp"
    text = head.decode("latin-1", errors="ignore").lstrip()
    if text.startswith("<svg") or text.startswith("<?xml"):
        return "image/svg+xml", ".svg"
    return None, None


class AdminMediaView(APIView):
    @require_admin
    def get(self, request):
        qs = MediaAsset.objects.all()
        folder = request.query_params.get("folder", "")
        if folder and folder != "all":
            qs = qs.filter(folder=folder)
        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(originalName__icontains=q)
        return paginate(request, qs, MediaAssetSerializer, default_limit=40, max_limit=100)

    @require_admin
    def post(self, request):
        file = request.FILES.get("file")
        if file is None:
            raise HttpError("No file provided", 400)
        if file.size > settings.MAX_UPLOAD_SIZE:
            raise HttpError("File too large (max 5 MB)", 413)

        head = file.read(32)
        file.seek(0)
        mime, ext = _detect_mime(head)
        if mime is None:
            raise HttpError(ALLOWED_MESSAGE, 415)

        folder = _sanitize_folder(request.data.get("folder") or "general")
        alt = str(request.data.get("alt") or "")[:300]
        caption = str(request.data.get("caption") or "")[:500]

        original = Path(file.name or "upload").name
        stem = re.sub(r"[^a-zA-Z0-9._-]", "_", Path(original).stem)[:60] or "asset"
        filename = f"{int(time.time() * 1000)}-{secrets.token_hex(6)}-{stem}{ext}"

        dest_dir = Path(settings.UPLOAD_ROOT) / folder
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / filename

        width = height = None
        thumb_url = ""
        if mime != "image/svg+xml":
            from PIL import Image, ImageOps

            try:
                img = Image.open(file)
                img = ImageOps.exif_transpose(img)
            except Exception:
                raise HttpError(ALLOWED_MESSAGE, 415)
            width, height = img.size
            if width > 2000 or height > 2000:
                img.thumbnail((2000, 2000), Image.LANCZOS)
                width, height = img.size

            if mime == "image/gif":
                file.seek(0)
                with open(dest, "wb") as fh:
                    shutil.copyfileobj(file, fh)
            else:
                if ext in (".jpg", ".jpeg") and img.mode != "RGB":
                    img = img.convert("RGB")
                if ext == ".jpg":
                    dest = dest.with_suffix(".jpg")
                    filename = dest.name
                    img.save(dest, "JPEG", quality=85, optimize=True)
                elif ext == ".png":
                    img.save(dest, "PNG", optimize=True)
                elif ext == ".webp":
                    img.save(dest, "WEBP", quality=85)
                try:
                    thumb = img.copy()
                    thumb.thumbnail((480, 480))
                    thumb_name = f"{Path(filename).stem}-thumb.webp"
                    thumb.save(dest_dir / thumb_name, "WEBP", quality=80)
                    thumb_url = f"/uploads/{folder}/{thumb_name}"
                except Exception:
                    thumb_url = ""

            size = dest.stat().st_size
        else:
            file.seek(0)
            with open(dest, "wb") as fh:
                shutil.copyfileobj(file, fh)
            size = dest.stat().st_size

        asset = MediaAsset.objects.create(
            filename=filename,
            originalName=str(file.name or "upload")[:200],
            url=f"/uploads/{folder}/{filename}",
            mimeType=mime,
            size=size,
            width=width,
            height=height,
            alt=alt,
            caption=caption,
            folder=folder,
            thumbUrl=thumb_url,
            uploadedBy=request.admin_obj,
        )
        return success(MediaAssetSerializer(asset).data, 201)


def _media_references(url):
    refs = []
    from apps.portfolio.models import Project, ProjectImage

    for img in ProjectImage.objects.filter(url=url).select_related("project"):
        refs.append(
            {"type": "project gallery", "id": str(img.project_id), "name": img.project.title, "field": "gallery"}
        )
    for project in Project.objects.filter(Q(thumbnailUrl=url) | Q(coverUrl=url)):
        refs.append(
            {
                "type": "project",
                "id": str(project.id),
                "name": project.title,
                "field": "thumbnail/cover",
                "status": project.status,
            }
        )
    for profile in Profile.objects.filter(Q(photoUrl=url) | Q(resumeUrl=url)):
        refs.append({"type": "profile", "id": str(profile.id), "name": profile.name, "field": "photo/resume"})
    for setting in WebsiteSetting.objects.filter(
        Q(logoUrl=url) | Q(ogImageUrl=url) | Q(faviconUrl=url) | Q(cvUrl=url) | Q(heroFallbackUrl=url)
    ):
        refs.append({"type": "site settings", "id": setting.id, "name": setting.siteName, "field": "branding"})
    for section in HomepageSection.objects.filter(backgroundUrl=url):
        refs.append({"type": "homepage section", "id": str(section.id), "name": f"#{section.order} {section.sectionType}", "field": "background"})
    for testimonial in Testimonial.objects.filter(photoUrl=url):
        refs.append({"type": "testimonial", "id": str(testimonial.id), "name": testimonial.clientName, "field": "photo"})
    return refs


class AdminMediaDetailView(APIView):
    def _get(self, pk):
        asset = MediaAsset.objects.filter(pk=pk).first()
        if asset is None:
            raise HttpError("Not found", 404)
        return asset

    @require_admin
    def get(self, request, pk):
        return success(MediaAssetSerializer(self._get(pk)).data)

    @require_admin
    def patch(self, request, pk):
        asset = self._get(pk)
        body = request.data if isinstance(request.data, dict) else {}
        if "alt" in body:
            asset.alt = str(body.get("alt") or "")[:300]
        if "caption" in body:
            asset.caption = str(body.get("caption") or "")[:500]
        if "folder" in body:
            asset.folder = _sanitize_folder(body.get("folder"))
        asset.save()
        return success(MediaAssetSerializer(asset).data)

    @require_admin
    def delete(self, request, pk):
        asset = self._get(pk)
        refs = _media_references(asset.url)
        if refs:
            return fail("Asset is still in use", 409, details=refs)
        root = Path(settings.UPLOAD_ROOT).resolve()
        for target in (asset.url, asset.thumbUrl):
            if not target:
                continue
            path = (root / target.removeprefix("/uploads/")).resolve()
            if root == path or root not in path.parents:
                continue  # refuse paths escaping the upload root
            try:
                path.unlink(missing_ok=True)
            except OSError:
                pass
        asset.delete()
        return success({"deleted": True})


# ============================ ADMIN: REVISIONS ============================


class AdminRevisionsView(APIView):
    @require_admin
    def get(self, request):
        qs = RevisionManager_query(request)
        return success(RevisionSerializer(qs, many=True).data)


def RevisionManager_query(request):
    from apps.core.models import Revision

    qs = Revision.objects.all()
    content = request.query_params.get("content", "")
    object_id = request.query_params.get("id", "")
    if content:
        qs = qs.filter(contentLabel=content)
    if object_id:
        qs = qs.filter(objectId=str(object_id))
    limit = request.query_params.get("limit", "50")
    try:
        limit = min(max(int(limit), 1), 200)
    except (TypeError, ValueError):
        limit = 50
    return qs[:limit]


class AdminRevisionRestoreView(APIView):
    @require_admin
    def post(self, request, pk):
        from apps.core.models import Revision

        revision = Revision.objects.filter(pk=pk).first()
        if revision is None:
            raise HttpError("Not found", 404)
        if revision.action == "delete":
            raise HttpError("Deleted objects cannot be restored automatically", 400)
        obj = restore_revision(revision, request.admin_obj)
        return success({"restored": True, "id": str(obj.pk), "repr": str(obj)})


# ============================ ADMIN: PREVIEWS ============================


class AdminPreviewHomepageView(APIView):
    """Authorized draft preview: returns ALL sections regardless of status."""

    @require_admin
    def get(self, request):
        sections = HomepageSection.objects.all().order_by("order", "id")
        return success(_resolve_sections(sections, include_unpublished_projects=True))


class AdminPreviewProjectView(APIView):
    @require_admin
    def get(self, request, slug):
        project = (
            Project.objects.select_related("category").prefetch_related("images").filter(slug=slug).first()
        )
        if project is None:
            raise HttpError("Project not found", 404)
        return success(ProjectSerializer(project).data)
