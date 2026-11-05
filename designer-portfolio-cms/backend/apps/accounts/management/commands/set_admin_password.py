"""Set or reset the admin account password from the command line.

Usage:
    python manage.py set_admin_password admin@example.com
    python manage.py set_admin_password admin@example.com --password "New#Pass"
"""
from getpass import getpass

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import AdminUser


class Command(BaseCommand):
    help = "Create or update an admin user's password."

    def add_arguments(self, parser):
        parser.add_argument("email")
        parser.add_argument("--password", help="New password (omit to be prompted)")

    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        password = options.get("password") or getpass("New password: ")
        if len(password) < 8:
            raise CommandError("Password must be at least 8 characters.")
        admin, created = AdminUser.objects.get_or_create(
            email=email,
            defaults={
                "passwordHash": make_password(password),
                "name": "Studio Admin",
                "role": "ADMIN",
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Admin created: {email}"))
        else:
            admin.passwordHash = make_password(password)
            admin.save(update_fields=["passwordHash", "updatedAt"])
            self.stdout.write(self.style.SUCCESS(f"Password updated for {email}"))
