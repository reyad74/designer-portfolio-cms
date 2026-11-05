from datetime import date, datetime

from django.db import transaction
from django.db.models import Count, F, Q
from django.utils import timezone
from rest_framework import serializers
from rest_framework.views import APIView

from apps.core.auth import require_admin
from apps.core.envelope import HttpError, success
from apps.core.pagination import paginate
from apps.core.revision import record_revision
from apps.portfolio.models import Project, ProjectCategory, ProjectImage
from apps.portfolio.serializers import (
    CategorySerializer,
    CategoryWriteSerializer,
    ProjectSerializer,
    ProjectWriteSerializer,
)


def _sort_options(sort):
    if sort == "oldest":
        return [F("projectDate").asc(nulls_last=True), "createdAt"]
    if sort == "popular":
        return ["-viewCount"]
    if sort == "featured":
        return ["-featured", "order"]
    return [F("projectDate").desc(nulls_last=True), "-createdAt"]


class PublicProjectsView(APIView):
    def get(self, request):
        qs = Project.public_queryset().select_related("category")
        category = request.query_params.get("category", "all")
        if category and category != "all":
            qs = qs.filter(category__slug=category)
        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(summary__icontains=q)
                | Q(description__icontains=q)
                | Q(clientName__icontains=q)
            )
        sort = request.query_params.get("sort", "newest")
        qs = qs.order_by(*_sort_options(sort))
        return paginate(request, qs, ProjectSerializer, default_limit=12, max_limit=48)


class FeaturedProjectsView(APIView):
    def get(self, request):
        qs = (
            Project.public_queryset()
            .filter(featured=True)
            .select_related("category")
            .order_by("order", F("projectDate").desc(nulls_last=True))[:6]
        )
        return success(ProjectSerializer(qs, many=True).data)


class PublicCategoriesView(APIView):
    def get(self, request):
        cats = ProjectCategory.objects.annotate(
            published_count=Count("projects", filter=Q(projects__status=Project.PUBLISHED))
        ).order_by("order", "name")
        data = [
            {
                "id": str(c.id),
                "name": c.name,
                "slug": c.slug,
                "description": c.description,
                "order": c.order,
                "projectCount": c.published_count,
            }
            for c in cats
        ]
        return success(data)


class PublicProjectDetailView(APIView):
    def get(self, request, slug):
        project = (
            Project.public_queryset()
            .select_related("category")
            .prefetch_related("images")
            .filter(slug=slug)
            .first()
        )
        if project is None:
            raise HttpError("Project not found", 404)

        related = (
            Project.public_queryset()
            .filter(category=project.category)
            .exclude(id=project.id)
            .select_related("category")
            .order_by("-featured", F("projectDate").desc(nulls_last=True))[:3]
        )

        next_project = None
        if project.projectDate:
            nxt = (
                Project.public_queryset()
                .filter(projectDate__gt=project.projectDate)
                .select_related("category")
                .order_by("projectDate")
                .first()
            )
            if nxt:
                next_project = {
                    "id": str(nxt.id),
                    "title": nxt.title,
                    "slug": nxt.slug,
                    "thumbnailUrl": nxt.thumbnailUrl,
                    "summary": nxt.summary,
                    "category": {
                        "id": str(nxt.category.id),
                        "name": nxt.category.name,
                        "slug": nxt.category.slug,
                    },
                }

        try:  # non-blocking view counter
            Project.objects.filter(id=project.id).update(viewCount=F("viewCount") + 1)
        except Exception:
            pass

        return success(
            {
                "project": ProjectSerializer(project).data,
                "related": ProjectSerializer(related, many=True).data,
                "next": next_project,
            }
        )


# ---------------- Admin ----------------


def _replace_images(project, images):
    if images is None:
        return
    if not isinstance(images, list):
        raise HttpError("images must be a list", 422)
    rows = []
    for i, img in enumerate(images[:40]):
        if not isinstance(img, dict) or not str(img.get("url") or "").strip():
            continue
        rows.append(
            ProjectImage(
                project=project,
                url=str(img["url"]).strip()[:500],
                alt=str(img.get("alt") or "")[:300],
                caption=str(img.get("caption") or "")[:500],
                order=i,
            )
        )
    project.images.all().delete()
    ProjectImage.objects.bulk_create(rows)


class AdminProjectsView(APIView):
    @require_admin
    def get(self, request):
        qs = Project.objects.select_related("category").all()
        status = request.query_params.get("status", "")
        if status in ("DRAFT", "PUBLISHED", "ARCHIVED"):
            qs = qs.filter(status=status)
        q = request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(title__icontains=q)
        qs = qs.order_by("order", "-updatedAt")
        return paginate(request, qs, ProjectSerializer, default_limit=50, max_limit=100)

    @require_admin
    def post(self, request):
        body = request.data if isinstance(request.data, dict) else {}
        serializer = ProjectWriteSerializer(data=body)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        slug = payload["slug"]
        if Project.objects.filter(slug=slug).exists():
            raise HttpError("Slug already in use", 409)
        category_id = payload.pop("categoryId")
        with transaction.atomic():
            project = Project.objects.create(category_id=category_id, **payload)
            _replace_images(project, body.get("images"))
        record_revision(project, "create", request.admin_obj)
        project.refresh_from_db()
        return success(ProjectSerializer(project).data, 201)


class AdminProjectDetailView(APIView):
    def _get(self, id):
        project = Project.objects.filter(id=id).first()
        if project is None:
            raise HttpError("Not found", 404)
        return project

    @require_admin
    def get(self, request, id):
        project = (
            Project.objects.select_related("category").prefetch_related("images").filter(id=id).first()
        )
        if project is None:
            raise HttpError("Not found", 404)
        return success(ProjectSerializer(project).data)

    @require_admin
    def patch(self, request, id):
        project = self._get(id)
        body = request.data if isinstance(request.data, dict) else {}
        serializer = ProjectWriteSerializer(data=body, partial=True)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        slug = payload.get("slug", project.slug)
        if Project.objects.filter(slug=slug).exclude(id=project.id).exists():
            raise HttpError("Slug already in use", 409)
        previous_status = project.status
        category_id = payload.pop("categoryId", project.category_id)
        for field, value in payload.items():
            setattr(project, field, value)
        project.category_id = category_id
        with transaction.atomic():
            project.save()
            _replace_images(project, body.get("images"))
        action = "update"
        new_status = payload.get("status", previous_status)
        if new_status != previous_status:
            action = "publish" if new_status == Project.PUBLISHED else "archive"
        record_revision(project, action, request.admin_obj)
        project.refresh_from_db()
        return success(ProjectSerializer(project).data)

    @require_admin
    def delete(self, request, id):
        project = self._get(id)
        record_revision(project, "delete", request.admin_obj)
        project.delete()
        return success({"deleted": True})


class AdminCategoriesView(APIView):
    @require_admin
    def get(self, request):
        cats = ProjectCategory.objects.annotate(total=Count("projects")).order_by("order", "name")
        data = []
        for c in cats:
            item = CategorySerializer(c).data
            item["projectCount"] = c.total  # admin view counts ALL projects
            item["_count"] = {"projects": c.total}
            data.append(item)
        return success(data)

    @require_admin
    def post(self, request):
        serializer = CategoryWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        if ProjectCategory.objects.filter(
            Q(slug=payload["slug"]) | Q(name=payload["name"])
        ).exists():
            raise HttpError("Category already exists", 409)
        category = ProjectCategory.objects.create(**payload)
        record_revision(category, "create", request.admin_obj)
        return success(CategorySerializer(category).data, 201)


class AdminCategoryDetailView(APIView):
    def _get(self, id):
        category = ProjectCategory.objects.filter(id=id).first()
        if category is None:
            raise HttpError("Not found", 404)
        return category

    @require_admin
    def patch(self, request, id):
        category = self._get(id)
        serializer = CategoryWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        if ProjectCategory.objects.filter(slug=payload["slug"]).exclude(id=category.id).exists():
            raise HttpError("Slug already in use", 409)
        for field, value in payload.items():
            setattr(category, field, value)
        category.save()
        record_revision(category, "update", request.admin_obj)
        return success(CategorySerializer(category).data)

    @require_admin
    def delete(self, request, id):
        category = self._get(id)
        used = category.projects.count()
        if used > 0:
            raise HttpError(f"Category is still used by {used} project(s)", 409)
        record_revision(category, "delete", request.admin_obj)
        category.delete()
        return success({"deleted": True})
