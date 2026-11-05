from rest_framework import serializers

from apps.inquiries.models import ContactInquiry


class InquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactInquiry
        fields = [
            "id", "fullName", "email", "company", "projectType", "budgetRange", "timeline",
            "message", "referenceUrl", "status", "adminNotes", "createdAt", "updatedAt",
        ]


class InquiryUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["UNREAD", "READ", "ARCHIVED"], required=False)
    adminNotes = serializers.CharField(max_length=2000, required=False, allow_blank=True)


class ContactWriteSerializer(serializers.Serializer):
    fullName = serializers.CharField(min_length=2, max_length=120)
    email = serializers.EmailField(max_length=200)
    company = serializers.CharField(max_length=160, required=False, allow_blank=True, default="")
    projectType = serializers.CharField(min_length=1, max_length=120)
    budgetRange = serializers.CharField(max_length=60, required=False, allow_blank=True, default="")
    timeline = serializers.CharField(max_length=60, required=False, allow_blank=True, default="")
    message = serializers.CharField(min_length=20, max_length=4000)
    referenceUrl = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
