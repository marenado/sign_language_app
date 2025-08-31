ACCESS = "sl_access"
REFRESH = "sl_refresh"

def _get_set_cookie(headers, name):
    cookies = [h for (k, h) in headers.raw if k.decode().lower() == "set-cookie"]
    for c in cookies:
        cd = c.decode()
        if cd.startswith(f"{name}="):
            return cd
    return ""

# 0) not logged in -> /auth/me should 401
async def test_me_requires_auth(client):
    r = await client.get("/auth/me")
    assert r.status_code == 401

# 1) refresh uses the refresh cookie and sets a new access cookie
async def test_refresh_sets_new_access_cookie(client):
    r = await client.post("/auth/login", json={"email": "alice@example.com", "password": "secret123"})
    assert r.status_code == 200

    rr = await client.post("/auth/refresh")
    assert rr.status_code == 200
    body = rr.json()
    assert "access_token" in body and body["access_token"]

    new_access_cookie = _get_set_cookie(rr.headers, ACCESS)
    assert new_access_cookie  # got a Set-Cookie for sl_access
    assert "HttpOnly" in new_access_cookie and "SameSite=None" in new_access_cookie

# 2) logout clears cookies and subsequent /auth/me fails
async def test_logout_clears_cookies_and_blocks_me(client):
    # login first
    r = await client.post("/auth/login", json={"email": "alice@example.com", "password": "secret123"})
    assert r.status_code == 200

    out = await client.post("/auth/logout")
    assert out.status_code == 200

    c_access = _get_set_cookie(out.headers, ACCESS)
    c_refresh = _get_set_cookie(out.headers, REFRESH)
    assert "Max-Age=0" in c_access
    assert "Max-Age=0" in c_refresh

    me = await client.get("/auth/me")
    assert me.status_code == 401

# 3) non-admin shouldn’t access admin area; admin should not get 401/403
async def test_admin_routes_are_protected(client):
    # regular user blocked
    await client.post("/auth/login", json={"email": "alice@example.com", "password": "secret123"})
    resp_user = await client.get("/admin/modules")
    assert resp_user.status_code in (401, 403, 422)  # 422 allowed if required query params are missing
    await client.post("/auth/logout")

    # admin allowed (shouldn’t be 401/403)
    await client.post("/auth/login", json={"email": "admin@example.com", "password": "adminpass"})
    resp_admin = await client.get("/admin/modules")
    assert resp_admin.status_code not in (401, 403)
