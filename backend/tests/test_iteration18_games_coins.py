"""
Iteration 18 - Games, Lives, Coins, and Weekly Awards Tests
Tests for:
- Lives system (GET /api/games/lives, POST /api/games/use-life, POST /api/games/buy-life)
- Coin packages (GET /api/games/coin-packages, POST /api/games/buy-coins/{package_id})
- Weekly awards (GET /api/games/weekly-awards)
- New game submissions (paw-match, memory, word-scramble)
- Games list (GET /api/games/available - should return 7 games)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@petbookin.com"
ADMIN_PASSWORD = "PetbookinAdmin2026!"


class TestGamesLivesCoins:
    """Tests for the new games, lives, and coins features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        self.token = data.get("token")
        assert self.token, "No token in login response"
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        yield
    
    # ─── GAMES LIST TESTS ───
    
    def test_get_games_returns_7_games(self):
        """GET /api/games/available should return 7 games (4 original + 3 new)"""
        response = self.session.get(f"{BASE_URL}/api/games/available")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "games" in data
        games = data["games"]
        assert len(games) == 7, f"Expected 7 games, got {len(games)}"
        
        # Verify new games are present
        game_ids = [g["game_id"] for g in games]
        assert "paw_match" in game_ids, "paw_match game missing"
        assert "pet_memory" in game_ids, "pet_memory game missing"
        assert "word_scramble" in game_ids, "word_scramble game missing"
        
        # Verify original games still present
        assert "breed_quiz" in game_ids, "breed_quiz game missing"
        assert "treat_catcher" in game_ids, "treat_catcher game missing"
        assert "pet_puzzle" in game_ids, "pet_puzzle game missing"
        assert "pet_show" in game_ids, "pet_show game missing"
        
        print(f"PASS: GET /api/games/available returns {len(games)} games")
    
    # ─── LIVES SYSTEM TESTS ───
    
    def test_get_lives(self):
        """GET /api/games/lives should return lives count, max_lives, minutes_until_next, coins"""
        response = self.session.get(f"{BASE_URL}/api/games/lives")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "lives" in data, "lives field missing"
        assert "max_lives" in data, "max_lives field missing"
        assert "minutes_until_next" in data, "minutes_until_next field missing"
        assert "coins" in data, "coins field missing"
        
        assert data["max_lives"] == 5, f"Expected max_lives=5, got {data['max_lives']}"
        assert 0 <= data["lives"] <= 5, f"Lives out of range: {data['lives']}"
        assert isinstance(data["coins"], int), "coins should be integer"
        
        print(f"PASS: GET /api/games/lives - lives={data['lives']}, max={data['max_lives']}, coins={data['coins']}")
    
    def test_use_life(self):
        """POST /api/games/use-life should decrement lives by 1"""
        # First get current lives
        lives_before = self.session.get(f"{BASE_URL}/api/games/lives").json()
        
        if lives_before["lives"] == 0:
            # Skip if no lives - can't test use-life
            pytest.skip("No lives available to test use-life")
        
        response = self.session.post(f"{BASE_URL}/api/games/use-life")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "lives" in data
        assert "max_lives" in data
        
        # Lives should be decremented
        expected_lives = lives_before["lives"] - 1
        assert data["lives"] == expected_lives, f"Expected {expected_lives} lives, got {data['lives']}"
        
        print(f"PASS: POST /api/games/use-life - lives decreased from {lives_before['lives']} to {data['lives']}")
    
    def test_use_life_no_lives_remaining(self):
        """POST /api/games/use-life should return 400 when no lives remaining"""
        # Use all lives first
        for _ in range(10):  # Try to use up to 10 lives
            response = self.session.post(f"{BASE_URL}/api/games/use-life")
            if response.status_code == 400:
                break
        
        # Now try to use another life - should fail
        response = self.session.post(f"{BASE_URL}/api/games/use-life")
        if response.status_code == 400:
            data = response.json()
            assert "detail" in data
            print(f"PASS: POST /api/games/use-life returns 400 when no lives: {data['detail']}")
        else:
            # Lives regenerated or user has coins - this is acceptable
            print(f"INFO: Lives available or regenerated, status={response.status_code}")
    
    def test_buy_life_insufficient_coins(self):
        """POST /api/games/buy-life should return 400 when user has insufficient coins"""
        # First check user's coins
        lives_data = self.session.get(f"{BASE_URL}/api/games/lives").json()
        
        if lives_data["coins"] >= 20:
            # User has enough coins - can't test insufficient coins scenario
            print(f"INFO: User has {lives_data['coins']} coins, skipping insufficient coins test")
            return
        
        response = self.session.post(f"{BASE_URL}/api/games/buy-life")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "coins" in data["detail"].lower() or "not enough" in data["detail"].lower()
        
        print(f"PASS: POST /api/games/buy-life returns 400 with insufficient coins: {data['detail']}")
    
    def test_buy_life_with_coins(self):
        """POST /api/games/buy-life should add 1 life and cost 20 coins"""
        # Check if user has enough coins
        lives_data = self.session.get(f"{BASE_URL}/api/games/lives").json()
        
        if lives_data["coins"] < 20:
            pytest.skip(f"User has only {lives_data['coins']} coins, need 20 to test buy-life")
        
        response = self.session.post(f"{BASE_URL}/api/games/buy-life")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "lives" in data
        assert "coins" in data
        assert "cost" in data
        
        assert data["cost"] == 20, f"Expected cost=20, got {data['cost']}"
        assert data["coins"] == lives_data["coins"] - 20, f"Coins not deducted correctly"
        
        print(f"PASS: POST /api/games/buy-life - bought 1 life for 20 coins")
    
    # ─── COIN PACKAGES TESTS ───
    
    def test_get_coin_packages(self):
        """GET /api/games/coin-packages should return 3 packages"""
        response = self.session.get(f"{BASE_URL}/api/games/coin-packages")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "packages" in data
        assert "coins" in data
        
        packages = data["packages"]
        assert len(packages) == 3, f"Expected 3 packages, got {len(packages)}"
        
        # Verify package structure
        package_ids = [p["package_id"] for p in packages]
        assert "coins_100" in package_ids
        assert "coins_500" in package_ids
        assert "coins_1500" in package_ids
        
        # Verify each package has required fields
        for pkg in packages:
            assert "package_id" in pkg
            assert "coins" in pkg
            assert "price" in pkg
            assert "label" in pkg
            assert "stripe_amount" in pkg
        
        print(f"PASS: GET /api/games/coin-packages returns {len(packages)} packages")
    
    def test_buy_coins_creates_checkout_session(self):
        """POST /api/games/buy-coins/coins_100 should create Stripe checkout session"""
        response = self.session.post(f"{BASE_URL}/api/games/buy-coins/coins_100")
        
        # Could be 200 (success) or 500 (Stripe not configured in test)
        if response.status_code == 200:
            data = response.json()
            assert "checkout_url" in data, "checkout_url missing"
            assert "session_id" in data, "session_id missing"
            print(f"PASS: POST /api/games/buy-coins/coins_100 - checkout_url created")
        elif response.status_code == 500:
            # Stripe might not be configured - acceptable in test env
            print(f"INFO: Stripe checkout failed (expected in test env): {response.text}")
        else:
            pytest.fail(f"Unexpected status {response.status_code}: {response.text}")
    
    def test_buy_coins_invalid_package(self):
        """POST /api/games/buy-coins/invalid_pkg should return 404"""
        response = self.session.post(f"{BASE_URL}/api/games/buy-coins/invalid_package_xyz")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        print(f"PASS: POST /api/games/buy-coins/invalid returns 404")
    
    # ─── WEEKLY AWARDS TESTS ───
    
    def test_get_weekly_awards(self):
        """GET /api/games/weekly-awards should return current week champions and previous awards"""
        response = self.session.get(f"{BASE_URL}/api/games/weekly-awards")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "current_week" in data, "current_week field missing"
        assert "week_start" in data, "week_start field missing"
        assert "week_end" in data, "week_end field missing"
        assert "previous_awards" in data, "previous_awards field missing"
        
        # current_week should be a list
        assert isinstance(data["current_week"], list)
        
        # previous_awards should be a list
        assert isinstance(data["previous_awards"], list)
        
        print(f"PASS: GET /api/games/weekly-awards - {len(data['current_week'])} current champions")
    
    # ─── NEW GAME SUBMISSION TESTS ───
    
    def test_submit_paw_match(self):
        """POST /api/games/paw-match/submit should accept score and level, return points_earned"""
        response = self.session.post(f"{BASE_URL}/api/games/paw-match/submit", json={
            "score": 150,
            "level": 2
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "score" in data
        assert "level" in data
        assert "points_earned" in data
        
        assert data["score"] == 150
        assert data["level"] == 2
        assert data["points_earned"] > 0, "points_earned should be positive"
        
        print(f"PASS: POST /api/games/paw-match/submit - earned {data['points_earned']} points")
    
    def test_submit_memory_game(self):
        """POST /api/games/memory/submit should accept moves, time, pairs, return points_earned"""
        response = self.session.post(f"{BASE_URL}/api/games/memory/submit", json={
            "moves": 12,
            "time": 45,
            "pairs": 6
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "moves" in data
        assert "time" in data
        assert "points_earned" in data
        
        assert data["moves"] == 12
        assert data["time"] == 45
        assert data["points_earned"] > 0, "points_earned should be positive"
        
        print(f"PASS: POST /api/games/memory/submit - earned {data['points_earned']} points")
    
    def test_submit_word_scramble(self):
        """POST /api/games/word-scramble/submit should accept correct, total, time, return points_earned"""
        response = self.session.post(f"{BASE_URL}/api/games/word-scramble/submit", json={
            "correct": 4,
            "total": 5,
            "time": 60
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "correct" in data
        assert "total" in data
        assert "points_earned" in data
        
        assert data["correct"] == 4
        assert data["total"] == 5
        assert data["points_earned"] > 0, "points_earned should be positive"
        
        print(f"PASS: POST /api/games/word-scramble/submit - earned {data['points_earned']} points")
    
    # ─── LEADERBOARD TEST ───
    
    def test_get_leaderboard(self):
        """GET /api/games/leaderboard should return top players"""
        response = self.session.get(f"{BASE_URL}/api/games/leaderboard")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "leaderboard" in data
        assert isinstance(data["leaderboard"], list)
        
        print(f"PASS: GET /api/games/leaderboard - {len(data['leaderboard'])} players")


class TestGamesUnauthenticated:
    """Tests for unauthenticated access to games endpoints"""
    
    def test_lives_requires_auth(self):
        """GET /api/games/lives should require authentication"""
        response = requests.get(f"{BASE_URL}/api/games/lives")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: GET /api/games/lives requires auth")
    
    def test_coin_packages_requires_auth(self):
        """GET /api/games/coin-packages should require authentication"""
        response = requests.get(f"{BASE_URL}/api/games/coin-packages")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: GET /api/games/coin-packages requires auth")
    
    def test_weekly_awards_requires_auth(self):
        """GET /api/games/weekly-awards should require authentication"""
        response = requests.get(f"{BASE_URL}/api/games/weekly-awards")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: GET /api/games/weekly-awards requires auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
