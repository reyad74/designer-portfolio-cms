from django.contrib.auth.hashers import check_password
from django.utils import timezone
from rest_framework.views import APIView

from apps.accounts.models import AdminUser
from apps.core.auth import (
    attach_auth_cookie,
    clear_auth_cookie,
    issue_token,
    require_admin,
)
from apps.core.envelope import HttpError, success
from apps.core.rate import check_scope, client_ip


def _admin_payload(admin):
    return {"id": str(admin.id), "email": admin.email, "name": admin.name, "role": admin.role}


class LoginView(APIView):
    def post(self, request):
        check_scope("login", client_ip(request))
        body = request.data if isinstance(request.data, dict) else {}
        email = str(body.get("email", "")).strip().lower()
        password = str(body.get("password", ""))
        if not email or len(password) < 8:
            raise HttpError("Invalid email or password", 401)
        admin = AdminUser.objects.filter(email__iexact=email).first()
        if admin is None or not check_password(password, admin.passwordHash):
            raise HttpError("Invalid email or password", 401)
        admin.lastLoginAt = timezone.now()
        admin.save(update_fields=["lastLoginAt", "updatedAt"])
        response = success(_admin_payload(admin))
        return attach_auth_cookie(response, issue_token(admin), secure=request.is_secure())


class MeView(APIView):
    @require_admin
    def get(self, request):
        return success(_admin_payload(request.admin_obj))


class RefreshView(APIView):
    """Rolling session: a still-valid cookie token is exchanged for a fresh one."""

    @require_admin
    def post(self, request):
        response = success(_admin_payload(request.admin_obj))
        return attach_auth_cookie(response, issue_token(request.admin_obj), secure=request.is_secure())


class LogoutView(APIView):
    def post(self, request):
        return clear_auth_cookie(success({"loggedOut": True}))


class DashboardView(APIView):
    @require_admin
    def get(self, request):
        from apps.cms.models import HomepageSection, MediaAsset, Service, Testimonial
        from apps.inquiries.models import ContactInquiry
        from apps.inquiries.serializers import InquirySerializer
        from apps.portfolio.models import Project, ProjectCategory

        inquiries = ContactInquiry.objects.all()
        recent = list(inquiries.order_by("-createdAt")[:5])
        top = list(Project.objects.order_by("-viewCount")[:5])
        data = {
            "totalProjects": Project.objects.count(),
            "publishedProjects": Project.objects.filter(status=Project.PUBLISHED).count(),
            "draftProjects": Project.objects.exclude(status=Project.PUBLISHED).count(),
            "featuredProjects": Project.objects.filter(featured=True).count(),
            "totalInquiries": inquiries.count(),
            "unreadInquiries": inquiries.filter(status=ContactInquiry.UNREAD).count(),
            "publishedTestimonials": Testimonial.objects.filter(published=True).count(),
            "pendingTestimonials": Testimonial.objects.filter(published=False).count(),
            "mediaCount": MediaAsset.objects.count(),
            "categories": ProjectCategory.objects.count(),
            "services": Service.objects.count(),
            "homepageSections": HomepageSection.objects.count(),
            "recentInquiries": InquirySerializer(recent, many=True).data,
            "topProjects": [
                {
                    "id": str(p.id),
                    "title": p.title,
                    "slug": p.slug,
                    "viewCount": p.viewCount,
                    "status": p.status,
                }
                for p in top
            ],
        }
        return success(data)
