from django.db import models


class TimeStampedModel(models.Model):
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Revision(models.Model):
    """Content revision snapshot: who changed what, when — restorable."""

    ACTIONS = [
        ("create", "create"),
        ("update", "update"),
        ("publish", "publish"),
        ("archive", "archive"),
        ("delete", "delete"),
        ("restore", "restore"),
    ]

    contentLabel = models.CharField(max_length=100, db_index=True)  # e.g. portfolio.project
    objectId = models.CharField(max_length=100, db_index=True)
    action = models.CharField(max_length=20, choices=ACTIONS, default="update")
    objectRepr = models.CharField(max_length=200, blank=True, default="")
    data = models.JSONField(default=dict)
    createdByName = models.CharField(max_length=120, blank=True, default="")
    createdByEmail = models.CharField(max_length=200, blank=True, default="")
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-createdAt"]
        indexes = [models.Index(fields=["contentLabel", "objectId"])]

    def __str__(self):
        return f"{self.contentLabel}#{self.objectId} {self.action} @ {self.createdAt:%Y-%m-%d %H:%M}"
