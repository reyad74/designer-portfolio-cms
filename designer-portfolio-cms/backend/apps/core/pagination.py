import math

from apps.core.envelope import HttpError, success


def parse_pagination(request, default_limit=12, max_limit=48):
    try:
        page = int(request.query_params.get("page", "1"))
        limit = int(request.query_params.get("limit", str(default_limit)))
    except (TypeError, ValueError):
        raise HttpError("Invalid pagination parameters", 422)
    page = max(page, 1)
    limit = min(max(limit, 1), max_limit)
    return page, limit


def paginate(request, queryset, serializer, default_limit=12, max_limit=48):
    """Slice a queryset and return the legacy list envelope with meta."""
    page, limit = parse_pagination(request, default_limit, max_limit)
    total = queryset.count()
    start = (page - 1) * limit
    items = queryset[start : start + limit]
    meta = {
        "page": page,
        "limit": limit,
        "total": total,
        "totalPages": max(math.ceil(total / limit), 1) if total else 1,
    }
    data = [serializer(item).data for item in items]
    return success(data, meta=meta)
