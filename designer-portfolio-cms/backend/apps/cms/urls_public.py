from django.urls import path

from apps.cms.views import (
    PublicHomepageView,
    PublicNavigationView,
    PublicProfileView,
    PublicResumeView,
    PublicServicesView,
    PublicSettingsView,
    PublicSkillsView,
    PublicTestimonialsView,
    PublicThemeView,
)

urlpatterns = [
    path("profile", PublicProfileView.as_view()),
    path("settings", PublicSettingsView.as_view()),
    path("theme", PublicThemeView.as_view()),
    path("navigation", PublicNavigationView.as_view()),
    path("homepage", PublicHomepageView.as_view()),
    path("services", PublicServicesView.as_view()),
    path("skills", PublicSkillsView.as_view()),
    path("resume", PublicResumeView.as_view()),
    path("testimonials", PublicTestimonialsView.as_view()),
]
