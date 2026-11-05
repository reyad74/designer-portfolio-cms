"""JWT auth (HS256) delivered via httpOnly cookie — reproduces the legacy
contract: cookie `av_admin_token`, 2h TTL, payload {sub, email, name, role}."""
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from django.conf import settings

from apps.core.envelope import HttpError, fail


def issue_token(admin):
    now = datetime.now(timezone.utc)
    ttl = timedelta(seconds=settings.JWT_TTL_SECONDS)
    payload = {
        "sub": str(admin.id),
        "email": admin.email,
        "name": admin.name,
        "role": admin.role,
        "iat": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def decode_token(token):
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HttpError("Session expired", 401)
    except jwt.InvalidTokenError:
        raise HttpError("Authentication required", 401)


def get_admin(request):
    """Return the AdminUser for the current request cookie, or None."""
    token = request.COOKIES.get(settings.ADMIN_COOKIE_NAME)
    if not token:
        return None
    payload = decode_token(token)
    from apps.accounts.models import AdminUser

    return AdminUser.objects.filter(id=payload.get("sub")).first()


def require_admin(view_method):
    """Decorator for DRF APIView methods: 401 envelope unless valid admin cookie."""

    @wraps(view_method)
    def wrapper(self, request, *args, **kwargs):
        admin = get_admin(request)
        if admin is None:
            return fail("Authentication required", 401)
        request.admin_obj = admin
        return view_method(self, request, *args, **kwargs)

    return wrapper


def attach_auth_cookie(response, token, secure=False):
    response.set_cookie(
        settings.ADMIN_COOKIE_NAME,
        token,
        max_age=settings.JWT_TTL_SECONDS,
        httponly=True,
        samesite="Lax",
        secure=secure,
        path="/",
    )
    return response


def clear_auth_cookie(response):
    response.set_cookie(settings.ADMIN_COOKIE_NAME, "", max_age=0, path="/")
    return response
