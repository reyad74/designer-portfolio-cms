from rest_framework.views import APIView

from apps.core.auth import require_admin
from apps.core.envelope import HttpError, success
from apps.core.pagination import paginate
from apps.core.rate import check_scope, client_ip
from apps.inquiries.models import ContactInquiry
from apps.inquiries.serializers import (
    ContactWriteSerializer,
    InquirySerializer,
    InquiryUpdateSerializer,
)


class PublicContactView(APIView):
    def post(self, request):
        check_scope("contact", client_ip(request))
        body = request.data if isinstance(request.data, dict) else {}
        # Honeypot: silently accept bots without storing anything
        if str(body.get("website", "") or "").strip():
            return success({"received": True})
        serializer = ContactWriteSerializer(data=body)
        serializer.is_valid(raise_exception=True)
        inquiry = ContactInquiry.objects.create(**serializer.validated_data)
        return success({"id": str(inquiry.id), "received": True}, 201)


class AdminInquiriesView(APIView):
    @require_admin
    def get(self, request):
        qs = ContactInquiry.objects.all()
        status = request.query_params.get("status", "")
        if status in ("UNREAD", "READ", "ARCHIVED"):
            qs = qs.filter(status=status)
        q = request.query_params.get("q", "").strip()
        if q:
            from django.db.models import Q

            qs = qs.filter(
                Q(fullName__icontains=q)
                | Q(email__icontains=q)
                | Q(message__icontains=q)
                | Q(company__icontains=q)
            )
        return paginate(request, qs, InquirySerializer, default_limit=20, max_limit=100)


class AdminInquiryDetailView(APIView):
    def _get(self, id):
        inquiry = ContactInquiry.objects.filter(id=id).first()
        if inquiry is None:
            raise HttpError("Not found", 404)
        return inquiry

    @require_admin
    def get(self, request, id):
        return success(InquirySerializer(self._get(id)).data)

    @require_admin
    def patch(self, request, id):
        inquiry = self._get(id)
        serializer = InquiryUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(inquiry, field, value)
        inquiry.save()
        return success(InquirySerializer(inquiry).data)

    @require_admin
    def delete(self, request, id):
        inquiry = self._get(id)
        inquiry.delete()
        return success({"deleted": True})
