from django.urls import path

from apps.portfolio.views import (
    AdminCategoriesView,
    AdminCategoryDetailView,
    AdminProjectDetailView,
    AdminProjectsView,
)

urlpatterns = [
    path("projects", AdminProjectsView.as_view()),
    path("projects/<int:id>", AdminProjectDetailView.as_view()),
    path("categories", AdminCategoriesView.as_view()),
    path("categories/<int:id>", AdminCategoryDetailView.as_view()),
]
