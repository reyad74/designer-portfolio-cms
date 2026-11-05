from django.urls import path

from apps.inquiries.views import AdminInquiriesView, AdminInquiryDetailView

urlpatterns = [
    path("inquiries", AdminInquiriesView.as_view()),
    path("inquiries/<int:id>", AdminInquiryDetailView.as_view()),
]
