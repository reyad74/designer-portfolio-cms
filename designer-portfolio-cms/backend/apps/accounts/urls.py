from django.urls import path

from apps.accounts.views import DashboardView, LoginView, LogoutView, MeView, RefreshView

urlpatterns = [
    path("auth/login", LoginView.as_view()),
    path("auth/me", MeView.as_view()),
    path("auth/refresh", RefreshView.as_view()),
    path("auth/logout", LogoutView.as_view()),
    path("dashboard", DashboardView.as_view()),
]
