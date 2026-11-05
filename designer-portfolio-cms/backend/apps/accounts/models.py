from django.db import models


class AdminUser(models.Model):
    ROLE_ADMIN = "ADMIN"
    ROLE_EDITOR = "EDITOR"
    ROLES = [(ROLE_ADMIN, "ADMIN"), (ROLE_EDITOR, "EDITOR")]

    email = models.EmailField(unique=True)
    passwordHash = models.CharField(max_length=250)
    name = models.CharField(max_length=120)
    role = models.CharField(max_length=20, choices=ROLES, default=ROLE_ADMIN)
    lastLoginAt = models.DateTimeField(null=True, blank=True)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["email"])]

    def __str__(self):
        return self.email
