from django.db import models

from apps.core.models import TimeStampedModel


class ContactInquiry(TimeStampedModel):
    UNREAD = "UNREAD"
    READ = "READ"
    ARCHIVED = "ARCHIVED"
    STATUSES = [(UNREAD, "Unread"), (READ, "Read"), (ARCHIVED, "Archived")]

    fullName = models.CharField(max_length=120)
    email = models.EmailField(max_length=200)
    company = models.CharField(max_length=160, blank=True, default="")
    projectType = models.CharField(max_length=120)
    budgetRange = models.CharField(max_length=60, blank=True, default="")
    timeline = models.CharField(max_length=60, blank=True, default="")
    message = models.TextField()
    referenceUrl = models.CharField(max_length=500, blank=True, default="")
    status = models.CharField(max_length=10, choices=STATUSES, default=UNREAD, db_index=True)
    adminNotes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-createdAt"]
        indexes = [models.Index(fields=["status"]), models.Index(fields=["createdAt"])]

    def __str__(self):
        return f"{self.fullName} <{self.email}>"
