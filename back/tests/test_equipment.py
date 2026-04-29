"""
Tests for /api/v1/equipment endpoint.

Covers:
- Fetching equipment list with valid auth (CEO role)
- Equipment response structure validation
- Unauthorized access → 401
- RBAC enforcement: PM role cannot access /equipment (only CEO, CISO) → 403
"""


class TestGetEquipment:
    """GET /api/v1/equipment"""

    def test_get_equipment_authenticated(self, client, auth_headers):
        """CEO should be able to fetch equipment list."""
        response = client.get("/api/v1/equipment", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3  # We seeded 3 items

    def test_equipment_structure(self, client, auth_headers):
        """Each equipment item should have the expected fields."""
        response = client.get("/api/v1/equipment", headers=auth_headers)
        data = response.json()
        assert len(data) > 0
        first = data[0]
        required_fields = {"id", "name", "type", "ip_address", "status", "risk_level"}
        assert required_fields.issubset(first.keys())

    def test_equipment_no_auth(self, client):
        """Request without token should return 401."""
        response = client.get("/api/v1/equipment")
        assert response.status_code == 401

    def test_equipment_pm_role_forbidden(self, client, pm_headers):
        """PM role should be forbidden from accessing /equipment (CEO, CISO only).

        Now that testpm exists in DB, this returns 403 (Forbidden) not 401.
        This is a REAL RBAC test.
        """
        response = client.get("/api/v1/equipment", headers=pm_headers)
        assert response.status_code == 403