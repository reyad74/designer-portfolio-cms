from django.urls import path

from apps.portfolio.views import (
    FeaturedProjectsView,
    PublicCategoriesView,
    PublicProjectDetailView,
    PublicProjectsView,
)

urlpatterns = [
    path("projects", PublicProjectsView.as_view()),
    path("projects/featured", FeaturedProjectsView.as_view()),
    path("projects/categories", PublicCategoriesView.as_view()),
    path("projects/<slug:slug>", PublicProjectDetailView.as_view()),
]
