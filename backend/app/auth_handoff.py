import secrets, time
_HANDOFF = {}  # code -> (refresh_token, exp_ts)

def make_code(refresh_token: str, ttl_seconds: int = 120) -> str:
    code = secrets.token_urlsafe(24)
    _HANDOFF[code] = (refresh_token, time.time() + ttl_seconds)
    return code

def pop_refresh(code: str) -> str | None:
    item = _HANDOFF.pop(code, None)
    if not item:
        return None
    refresh, exp = item
    return refresh if time.time() <= exp else None
