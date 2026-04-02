"""
Iteration 11 - Tournament and Top Contributor Feature Tests
Tests for:
- GET /api/tournaments/active - returns seeded active tournaments
- POST /api/tournaments/enter - user can submit an entry
- GET /api/tournaments/{tournament_id}/entries - list entries sorted by votes
- POST /api/tournaments/{tournament_id}/vote/{entry_id} - toggle vote
- GET /api/tournaments/top-contributor - returns weekly top contributor
- GET /api/tournaments/past - returns completed tournaments
- GET /api/tournaments/hall-of-fame - returns tournament champions
- POST /api/tournaments/admin/create - admin can create tournaments
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@petbookin.com"
ADMIN_PASSWORD = "PetbookinAdmin2026!"
FREE_USER_EMAIL = "freeuser@test.com"
FREE_USER_PASSWORD = "Test1234!"


class TestTournamentAuth:
    """Authentication setup for tournament tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def free_user_token(self):
        """Get free user auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FREE_USER_EMAIL,
            "password": FREE_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Free user login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    @pytest.fixture
    def free_user_headers(self, free_user_token):
        return {"Authorization": f"Bearer {free_user_token}", "Content-Type": "application/json"}


class TestActiveTournaments(TestTournamentAuth):
    """Test GET /api/tournaments/active endpoint"""
    
    def test_get_active_tournaments_returns_list(self, admin_headers):
        """Active tournaments endpoint returns a list of tournaments"""
        response = requests.get(f"{BASE_URL}/api/tournaments/active", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tournaments" in data, "Response should contain 'tournaments' key"
        assert isinstance(data["tournaments"], list), "Tournaments should be a list"
    
    def test_active_tournaments_seeded_with_3(self, admin_headers):
        """Should have at least 3 seeded tournaments"""
        response = requests.get(f"{BASE_URL}/api/tournaments/active", headers=admin_headers)
        assert response.status_code == 200
        
        tournaments = response.json()["tournaments"]
        assert len(tournaments) >= 3, f"Expected at least 3 tournaments, got {len(tournaments)}"
    
    def test_tournament_has_required_fields(self, admin_headers):
        """Each tournament should have required fields"""
        response = requests.get(f"{BASE_URL}/api/tournaments/active", headers=admin_headers)
        assert response.status_code == 200
        
        tournaments = response.json()["tournaments"]
        if len(tournaments) > 0:
            t = tournaments[0]
            required_fields = ["tournament_id", "title", "description", "tournament_type", 
                             "status", "start_date", "end_date", "entry_count"]
            for field in required_fields:
                assert field in t, f"Tournament missing required field: {field}"
            assert t["status"] == "active", "Tournament status should be 'active'"
    
    def test_tournament_includes_user_entry_status(self, admin_headers):
        """Tournament should include user_entered field"""
        response = requests.get(f"{BASE_URL}/api/tournaments/active", headers=admin_headers)
        assert response.status_code == 200
        
        tournaments = response.json()["tournaments"]
        if len(tournaments) > 0:
            t = tournaments[0]
            assert "user_entered" in t, "Tournament should include user_entered field"


class TestTournamentEntry(TestTournamentAuth):
    """Test POST /api/tournaments/enter endpoint"""
    
    def test_enter_tournament_requires_tournament_id(self, free_user_headers):
        """Entry requires tournament_id"""
        response = requests.post(f"{BASE_URL}/api/tournaments/enter", 
                                json={"title": "Test Entry"},
                                headers=free_user_headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "Tournament ID required" in response.json().get("detail", "")
    
    def test_enter_tournament_requires_title(self, free_user_headers):
        """Entry requires title for non-quiz tournaments"""
        # First get an active tournament
        active_res = requests.get(f"{BASE_URL}/api/tournaments/active", headers=free_user_headers)
        tournaments = active_res.json().get("tournaments", [])
        
        # Find a non-quiz tournament
        non_quiz = next((t for t in tournaments if t["tournament_type"] != "breed_quiz"), None)
        if not non_quiz:
            pytest.skip("No non-quiz tournament available")
        
        response = requests.post(f"{BASE_URL}/api/tournaments/enter",
                                json={"tournament_id": non_quiz["tournament_id"], "title": ""},
                                headers=free_user_headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_enter_tournament_success(self, free_user_headers):
        """Successfully enter a tournament"""
        # Get active tournaments
        active_res = requests.get(f"{BASE_URL}/api/tournaments/active", headers=free_user_headers)
        tournaments = active_res.json().get("tournaments", [])
        
        # Find a tournament user hasn't entered
        available = next((t for t in tournaments if not t.get("user_entered")), None)
        if not available:
            pytest.skip("User already entered all tournaments")
        
        response = requests.post(f"{BASE_URL}/api/tournaments/enter",
                                json={
                                    "tournament_id": available["tournament_id"],
                                    "title": "TEST_My Amazing Pet Entry",
                                    "description": "Test entry for tournament testing"
                                },
                                headers=free_user_headers)
        
        # Could be 200 or 400 if already entered
        if response.status_code == 400 and "already entered" in response.json().get("detail", "").lower():
            pytest.skip("User already entered this tournament")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "entry_id" in data, "Response should contain entry_id"
        assert data["title"] == "TEST_My Amazing Pet Entry"
    
    def test_cannot_enter_same_tournament_twice(self, admin_headers):
        """User cannot enter the same tournament twice"""
        # Get active tournaments
        active_res = requests.get(f"{BASE_URL}/api/tournaments/active", headers=admin_headers)
        tournaments = active_res.json().get("tournaments", [])
        
        if len(tournaments) == 0:
            pytest.skip("No active tournaments")
        
        # Find one admin has entered
        entered = next((t for t in tournaments if t.get("user_entered")), None)
        if not entered:
            # Enter one first
            t = tournaments[0]
            requests.post(f"{BASE_URL}/api/tournaments/enter",
                         json={"tournament_id": t["tournament_id"], "title": "Admin Entry"},
                         headers=admin_headers)
            entered = t
        
        # Try to enter again
        response = requests.post(f"{BASE_URL}/api/tournaments/enter",
                                json={"tournament_id": entered["tournament_id"], "title": "Duplicate Entry"},
                                headers=admin_headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "already entered" in response.json().get("detail", "").lower()


class TestTournamentEntries(TestTournamentAuth):
    """Test GET /api/tournaments/{tournament_id}/entries endpoint"""
    
    def test_get_entries_returns_list(self, admin_headers):
        """Get entries returns a list"""
        # Get active tournaments
        active_res = requests.get(f"{BASE_URL}/api/tournaments/active", headers=admin_headers)
        tournaments = active_res.json().get("tournaments", [])
        
        if len(tournaments) == 0:
            pytest.skip("No active tournaments")
        
        tid = tournaments[0]["tournament_id"]
        response = requests.get(f"{BASE_URL}/api/tournaments/{tid}/entries", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "entries" in data, "Response should contain 'entries' key"
        assert isinstance(data["entries"], list), "Entries should be a list"
    
    def test_entries_have_required_fields(self, admin_headers):
        """Each entry should have required fields"""
        active_res = requests.get(f"{BASE_URL}/api/tournaments/active", headers=admin_headers)
        tournaments = active_res.json().get("tournaments", [])
        
        # Find tournament with entries
        for t in tournaments:
            tid = t["tournament_id"]
            response = requests.get(f"{BASE_URL}/api/tournaments/{tid}/entries", headers=admin_headers)
            entries = response.json().get("entries", [])
            
            if len(entries) > 0:
                entry = entries[0]
                required_fields = ["entry_id", "tournament_id", "user_id", "user_name", 
                                  "title", "votes_count", "user_voted"]
                for field in required_fields:
                    assert field in entry, f"Entry missing required field: {field}"
                return
        
        pytest.skip("No entries found in any tournament")


class TestTournamentVoting(TestTournamentAuth):
    """Test POST /api/tournaments/{tournament_id}/vote/{entry_id} endpoint"""
    
    def test_cannot_vote_own_entry(self, admin_headers):
        """User cannot vote for their own entry"""
        # Get active tournaments
        active_res = requests.get(f"{BASE_URL}/api/tournaments/active", headers=admin_headers)
        tournaments = active_res.json().get("tournaments", [])
        
        # Find tournament where admin has an entry
        for t in tournaments:
            if t.get("user_entered") and t.get("user_entry"):
                entry_id = t["user_entry"]["entry_id"]
                tid = t["tournament_id"]
                
                response = requests.post(f"{BASE_URL}/api/tournaments/{tid}/vote/{entry_id}",
                                        json={}, headers=admin_headers)
                assert response.status_code == 400, f"Expected 400, got {response.status_code}"
                assert "own entry" in response.json().get("detail", "").lower()
                return
        
        pytest.skip("Admin has no entries to test self-voting")
    
    def test_vote_toggle_works(self, free_user_headers, admin_headers):
        """Voting toggles on and off"""
        # Get active tournaments
        active_res = requests.get(f"{BASE_URL}/api/tournaments/active", headers=admin_headers)
        tournaments = active_res.json().get("tournaments", [])
        
        # Find tournament with admin entry
        for t in tournaments:
            tid = t["tournament_id"]
            entries_res = requests.get(f"{BASE_URL}/api/tournaments/{tid}/entries", headers=free_user_headers)
            entries = entries_res.json().get("entries", [])
            
            # Find entry not by free user
            for entry in entries:
                if entry["user_id"] != "free_user_id":  # Will work since we check user_voted
                    entry_id = entry["entry_id"]
                    initial_voted = entry.get("user_voted", False)
                    
                    # Vote
                    vote_res = requests.post(f"{BASE_URL}/api/tournaments/{tid}/vote/{entry_id}",
                                            json={}, headers=free_user_headers)
                    
                    if vote_res.status_code == 400 and "own entry" in vote_res.json().get("detail", "").lower():
                        continue  # This is free user's entry, skip
                    
                    assert vote_res.status_code == 200, f"Vote failed: {vote_res.status_code} - {vote_res.text}"
                    
                    data = vote_res.json()
                    assert "voted" in data, "Response should contain 'voted' field"
                    assert "votes_count" in data, "Response should contain 'votes_count' field"
                    
                    # Toggle should flip the voted state
                    assert data["voted"] != initial_voted, "Vote should toggle"
                    return
        
        pytest.skip("No entries available to vote on")


class TestTopContributor(TestTournamentAuth):
    """Test GET /api/tournaments/top-contributor endpoint"""
    
    def test_top_contributor_returns_data(self, admin_headers):
        """Top contributor endpoint returns expected structure"""
        response = requests.get(f"{BASE_URL}/api/tournaments/top-contributor", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "week_start" in data, "Response should contain 'week_start'"
        # top_contributor can be null if no activity
        assert "top_contributor" in data or "top_10" in data, "Response should contain contributor data"
    
    def test_top_10_is_list(self, admin_headers):
        """Top 10 should be a list"""
        response = requests.get(f"{BASE_URL}/api/tournaments/top-contributor", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        if "top_10" in data:
            assert isinstance(data["top_10"], list), "top_10 should be a list"


class TestPastTournaments(TestTournamentAuth):
    """Test GET /api/tournaments/past endpoint"""
    
    def test_past_tournaments_returns_list(self, admin_headers):
        """Past tournaments endpoint returns a list"""
        response = requests.get(f"{BASE_URL}/api/tournaments/past", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "tournaments" in data, "Response should contain 'tournaments' key"
        assert isinstance(data["tournaments"], list), "Tournaments should be a list"


class TestHallOfFame(TestTournamentAuth):
    """Test GET /api/tournaments/hall-of-fame endpoint"""
    
    def test_hall_of_fame_returns_list(self, admin_headers):
        """Hall of fame endpoint returns a list of champions"""
        response = requests.get(f"{BASE_URL}/api/tournaments/hall-of-fame", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "champions" in data, "Response should contain 'champions' key"
        assert isinstance(data["champions"], list), "Champions should be a list"


class TestAdminCreateTournament(TestTournamentAuth):
    """Test POST /api/tournaments/admin/create endpoint"""
    
    def test_non_admin_cannot_create(self, free_user_headers):
        """Non-admin users cannot create tournaments"""
        response = requests.post(f"{BASE_URL}/api/tournaments/admin/create",
                                json={
                                    "title": "Unauthorized Tournament",
                                    "description": "Should fail",
                                    "tournament_type": "pet_show"
                                },
                                headers=free_user_headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_admin_can_create_tournament(self, admin_headers):
        """Admin can create a new tournament"""
        response = requests.post(f"{BASE_URL}/api/tournaments/admin/create",
                                json={
                                    "title": "TEST_Admin Created Tournament",
                                    "description": "Tournament created by admin for testing",
                                    "tournament_type": "pet_show",
                                    "category": "Test Category",
                                    "duration_days": 3
                                },
                                headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tournament_id" in data, "Response should contain tournament_id"
        assert data["title"] == "TEST_Admin Created Tournament"
        assert data["status"] == "active"
    
    def test_create_tournament_requires_title(self, admin_headers):
        """Creating tournament requires a title"""
        response = requests.post(f"{BASE_URL}/api/tournaments/admin/create",
                                json={
                                    "title": "",
                                    "description": "No title",
                                    "tournament_type": "pet_show"
                                },
                                headers=admin_headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
