from django.urls import path

from apps.inquiries.views import PublicContactView

urlpatterns = [
    path("contact", PublicContactView.as_view()),
]
