"""In-memory sliding-window rate limiter (same semantics as the legacy API).

The dev/prod deployment is single-process via the Next.js proxy; for multi
instance deployments swap for a shared store (documented in README).
"""
import threading
import time

_buckets: dict = {}
_lock = threading.Lock()

# Scoped limits (mirrors legacy behavior)
SCOPES = {
    "contact": (5, 3600),   # 5 per hour per IP
    "login": (8, 900),      # 8 per 15 minutes per IP
}


def rate_limit(key, limit, window_seconds):
    """Return (allowed, retry_after_seconds)."""
    now = time.time()
    with _lock:
        if len(_buckets) > 20000:  # opportunistic sweep
            for k in [k for k, v in _buckets.items() if not v or now - v[-1] > 3600]:
                _buckets.pop(k, None)
        bucket = [t for t in _buckets.get(key, []) if now - t < window_seconds]
        if len(bucket) >= limit:
            retry = int(window_seconds - (now - bucket[0])) + 1
            _buckets[key] = bucket
            return False, retry
        bucket.append(now)
        _buckets[key] = bucket
        return True, 0


def check_scope(scope, identifier):
    limit, window = SCOPES[scope]
    allowed, retry = rate_limit(f"{scope}:{identifier}", limit, window)
    if not allowed:
        from apps.core.envelope import HttpError

        raise HttpError(
            f"Too many requests. Please try again in {max(retry // 60, 1)} minute(s).", 429
        )


def client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("HTTP_X_REAL_IP") or request.META.get("REMOTE_ADDR", "unknown")
