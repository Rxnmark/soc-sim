"""
Tests for /api/v1/simulation/* endpoints.

Covers:
- Getting simulation status (structure validation)
- Starting simulation
- Stopping simulation
- Speed control
- Pause/Resume flow
"""


class TestSimulationStatus:
    """GET /api/v1/simulation/status"""

    def test_get_status(self, client, auth_headers):
        """Should return simulation status object."""
        response = client.get("/api/v1/simulation/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "is_running" in data
        assert "is_paused" in data
        assert "speed_multiplier" in data
        assert isinstance(data["is_running"], bool)

    def test_status_no_auth(self, client):
        """Unauthenticated request should return 401."""
        response = client.get("/api/v1/simulation/status")
        assert response.status_code == 401


class TestSimulationControls:
    """POST endpoints for simulation control."""

    def test_start_simulation(self, client, auth_headers):
        """Starting simulation should return success status."""
        response = client.post("/api/v1/simulation/start", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "started"

    def test_stop_simulation(self, client, auth_headers):
        """Stopping simulation should return success status."""
        response = client.post("/api/v1/simulation/stop", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "stopped"

    def test_pause_resume(self, client, auth_headers):
        """Pause and resume should work in sequence."""
        # Start first
        client.post("/api/v1/simulation/start", headers=auth_headers)

        # Pause
        response = client.post("/api/v1/simulation/pause", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "paused"

        # Resume
        response = client.post("/api/v1/simulation/resume", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "resumed"

        # Stop
        client.post("/api/v1/simulation/stop", headers=auth_headers)

    def test_set_speed(self, client, auth_headers):
        """Speed multiplier should be accepted and echoed back."""
        response = client.post(
            "/api/v1/simulation/speed",
            headers=auth_headers,
            json={"speed_multiplier": 0.25},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["speed_multiplier"] == 0.25

    def test_simulation_no_auth(self, client):
        """Simulation control without token should return 401."""
        response = client.post("/api/v1/simulation/start")
        assert response.status_code == 401