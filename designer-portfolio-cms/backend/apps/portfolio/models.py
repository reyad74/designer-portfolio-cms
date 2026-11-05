from django.db import models

from apps.core.models import TimeStampedModel


class ProjectCategory(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True)
    description = models.CharField(max_length=300, blank=True, default="")
    order = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class Project(TimeStampedModel):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"
    STATUSES = [(DRAFT, "Draft"), (PUBLISHED, "Published"), (ARCHIVED, "Archived")]

    title = models.CharField(max_length=160)
    slug = models.SlugField(max_length=170, unique=True)
    summary = models.TextField()
    description = models.TextField()
    category = models.ForeignKey(ProjectCategory, on_delete=models.PROTECT, related_name="projects")
    clientName = models.CharField(max_length=160, blank=True, default="")
    projectDate = models.DateField(null=True, blank=True)
    year = models.IntegerField(null=True, blank=True)
    tools = models.TextField(blank=True, default="")  # JSON string array (normalized on save)
    thumbnailUrl = models.CharField(max_length=500, blank=True, default="")
    coverUrl = models.CharField(max_length=500, blank=True, default="")
    accentColor = models.CharField(max_length=20, blank=True, default="")
    objectives = models.TextField(blank=True, default="")
    challenges = models.TextField(blank=True, default="")
    research = models.TextField(blank=True, default="")
    strategy = models.TextField(blank=True, default="")
    concept = models.TextField(blank=True, default="")
    outcome = models.TextField(blank=True, default="")
    colorPalette = models.TextField(blank=True, default="")  # JSON [{name, hex}]
    typography = models.TextField(blank=True, default="")    # JSON string array
    applications = models.TextField(blank=True, default="")  # JSON string array
    featured = models.BooleanField(default=False)
    status = models.CharField(max_length=12, choices=STATUSES, default=DRAFT, db_index=True)
    publishAt = models.DateTimeField(null=True, blank=True)  # scheduled publishing
    order = models.IntegerField(default=0)
    viewCount = models.IntegerField(default=0)
    seoTitle = models.CharField(max_length=200, blank=True, default="")
    seoDescription = models.CharField(max_length=320, blank=True, default="")

    class Meta:
        ordering = ["order", "-updatedAt"]
        indexes = [
            models.Index(fields=["status", "featured"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self):
        return self.title

    @classmethod
    def public_queryset(cls):
        """Only published, non-scheduled-future projects ever reach the public API."""
        from django.utils import timezone

        return cls.objects.filter(status=cls.PUBLISHED).filter(
            models.Q(publishAt__isnull=True) | models.Q(publishAt__lte=timezone.now())
        )


class ProjectImage(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="images")
    url = models.CharField(max_length=500)
    alt = models.CharField(max_length=300, blank=True, default="")
    caption = models.CharField(max_length=500, blank=True, default="")
    order = models.IntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "id"]
        indexes = [models.Index(fields=["url"])]

    def __str__(self):
        return f"{self.project_id} image {self.order}"
