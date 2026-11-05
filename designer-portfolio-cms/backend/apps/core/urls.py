from django.urls import include, path

urlpatterns = [
    path("", include("apps.cms.urls_public")),
    path("", include("apps.portfolio.urls_public")),
    path("", include("apps.inquiries.urls_public")),
    path("admin/", include("apps.accounts.urls")),
    path("admin/", include("apps.cms.urls_admin")),
    path("admin/", include("apps.portfolio.urls_admin")),
    path("admin/", include("apps.inquiries.urls_admin")),
]
