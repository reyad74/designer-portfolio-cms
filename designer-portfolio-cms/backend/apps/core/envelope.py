"""Response envelope + exception handling that reproduces the legacy contract:

success: {"success": true, "data": <T>[, "meta": {page, limit, total, totalPages}]}
error:   {"success": false, "error": "<message>"[, "details": ...]}
"""
import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger("api")

DEFAULT_MESSAGES = {
    401: "Authentication required",
    403: "Permission denied",
    404: "Not found",
    405: "Method not allowed",
}


def success(data, http_status=200, meta=None, headers=None):
    body = {"success": True, "data": data}
    if meta is not None:
        body["meta"] = meta
    return Response(body, status=http_status, headers=headers)


def fail(error, http_status=400, details=None):
    body = {"success": False, "error": error}
    if details is not None:
        body["details"] = details
    return Response(body, status=http_status)


class HttpError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def exception_handler(exc, context):
    if isinstance(exc, HttpError):
        return fail(exc.message, exc.status_code)

    if isinstance(exc, DjangoValidationError):
        details = getattr(exc, "message_dict", None) or getattr(exc, "messages", [str(exc)])
        return fail("Validation failed", 422, details)

    response = drf_exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled API error: %s", exc)
        return fail("Internal server error", 500)

    code = response.status_code
    data = getattr(response, "data", None)

    if isinstance(exc, DRFValidationError):
        return fail("Validation failed", 422, data)

    if code == 404 and isinstance(exc, Http404):
        return fail(DEFAULT_MESSAGES[404], 404)

    detail = data.get("detail") if isinstance(data, dict) and data.get("detail") else None
    message = str(detail) if detail else DEFAULT_MESSAGES.get(code, "Request failed")
    return fail(message, code)
