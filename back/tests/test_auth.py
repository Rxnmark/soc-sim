"""
Tests for /api/v1/auth/* endpoints.

Covers:
- Successful login (returns JWT token)
- Failed login (invalid credentials → 401)
- /me endpoint with valid token
- /me endpoint without token → 401
- Logout endpoint
"""


class TestAuthLogin:
    """POST /api/v1/auth/login"""

    def test_login_success(self, client):
        """Valid credentials should return an access_token."""
        response = client.post("/api/v1/auth/login", json={
            "username": "testceo",
            "password": "testpass123",
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["role"] == "CEO"

    def test_login_wrong_password(self, client):
        """Wrong password should return 401."""
        response = client.post("/api/v1/auth/login", json={
            "username": "testceo",
            "password": "wrongpassword",
        })
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]

    def test_login_nonexistent_user(self, client):
        """Non-existent user should return 401."""
        response = client.post("/api/v1/auth/login", json={
            "username": "ghost_user",
            "password": "irrelevant",
        })
        assert response.status_code == 401

    def test_login_empty_body(self, client):
        """Missing fields should return 422 (Pydantic validation)."""
        response = client.post("/api/v1/auth/login", json={})
        assert response.status_code == 422


class TestAuthMe:
    """/api/v1/auth/me — requires valid Bearer token."""

    def test_me_authenticated(self, client, auth_headers):
        """Authenticated request should return user info."""
        response = client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testceo"
        assert data["role"] == "CEO"
        assert data["is_2fa_enabled"] is False

    def test_me_no_token(self, client):
        """Request without token should return 401."""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

    def test_me_invalid_token(self, client):
        """Request with garbage token should return 401."""
        response = client.get("/api/v1/auth/me", headers={
            "Authorization": "Bearer invalid.token.here"
        })
        assert response.status_code == 401


class TestAuthLogout:
    """POST /api/v1/auth/logout — stateless, always succeeds."""

    def test_logout(self, client):
        """Logout should return 200 with success message."""
        response = client.post("/api/v1/auth/logout")
        assert response.status_code == 200
        assert "Logged out" in response.json()["detail"]