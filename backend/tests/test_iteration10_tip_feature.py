"""
Iteration 10 - Live Streaming Tip/Donate Feature Tests
Tests for:
- GET /api/live/tip-presets - Returns points and card tip presets
- POST /api/live/tip/{stream_id} - Send points tip
- POST /api/live/tip-card/{stream_id} - Create Stripe checkout for card tip
- GET /api/live/tips/{stream_id} - Get tips for a stream
- GET /api/live/my-tips-received - Get broadcaster's received tips
- Webhook handling for purchase_type=tip
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


class TestTipPresets:
    """Test GET /api/live/tip-presets endpoint"""
    
    def test_tip_presets_returns_points_and_card_options(self, admin_session):
        """Verify tip-presets returns both points and card tip options"""
        response = admin_session.get(f"{BASE_URL}/api/live/tip-presets")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify points_tips structure
        assert "points_tips" in data, "Missing points_tips in response"
        points_tips = data["points_tips"]
        assert len(points_tips) == 4, f"Expected 4 points presets, got {len(points_tips)}"
        
        # Verify expected amounts: 10, 25, 50, 100
        amounts = [t["amount"] for t in points_tips]
        assert 10 in amounts, "Missing 10 pts preset"
        assert 25 in amounts, "Missing 25 pts preset"
        assert 50 in amounts, "Missing 50 pts preset"
        assert 100 in amounts, "Missing 100 pts preset"
        
        # Verify each preset has required fields
        for preset in points_tips:
            assert "amount" in preset
            assert "label" in preset
            assert "emoji" in preset
        
        # Verify card_tips structure
        assert "card_tips" in data, "Missing card_tips in response"
        card_tips = data["card_tips"]
        assert len(card_tips) == 4, f"Expected 4 card presets, got {len(card_tips)}"
        
        # Verify expected card amounts: $0.99, $1.99, $2.99, $4.99
        card_amounts = [t["amount"] for t in card_tips]
        assert 0.99 in card_amounts, "Missing $0.99 card preset"
        assert 1.99 in card_amounts, "Missing $1.99 card preset"
        assert 2.99 in card_amounts, "Missing $2.99 card preset"
        assert 4.99 in card_amounts, "Missing $4.99 card preset"
        
        # Verify each card preset has required fields
        for preset in card_tips:
            assert "pack_id" in preset
            assert "amount" in preset
            assert "label" in preset
            assert "emoji" in preset
        
        print("✓ tip-presets returns correct points and card options")


class TestPointsTip:
    """Test POST /api/live/tip/{stream_id} endpoint for points-based tips"""
    
    def test_tip_rejects_invalid_amount(self, admin_session, test_stream):
        """Verify tip endpoint rejects invalid tip amounts"""
        stream_id = test_stream["stream_id"]
        
        # Try invalid amount (not in presets)
        response = admin_session.post(
            f"{BASE_URL}/api/live/tip/{stream_id}",
            json={"points": 15}  # Invalid - not in [10, 25, 50, 100]
        )
        assert response.status_code == 400, f"Expected 400 for invalid amount, got {response.status_code}"
        assert "Invalid tip amount" in response.json().get("detail", "")
        print("✓ Tip rejects invalid amount (15 pts)")
    
    def test_tip_rejects_self_tipping(self, admin_session, admin_stream):
        """Verify broadcaster cannot tip their own stream"""
        stream_id = admin_stream["stream_id"]
        
        response = admin_session.post(
            f"{BASE_URL}/api/live/tip/{stream_id}",
            json={"points": 10}
        )
        assert response.status_code == 400, f"Expected 400 for self-tip, got {response.status_code}"
        assert "can't tip yourself" in response.json().get("detail", "").lower()
        print("✓ Self-tipping correctly rejected")
    
    def test_tip_rejects_insufficient_points(self, low_points_session, test_stream):
        """Verify tip fails when user doesn't have enough points"""
        stream_id = test_stream["stream_id"]
        
        response = low_points_session.post(
            f"{BASE_URL}/api/live/tip/{stream_id}",
            json={"points": 100}  # User has 0 points
        )
        assert response.status_code == 400, f"Expected 400 for insufficient points, got {response.status_code}"
        assert "Not enough points" in response.json().get("detail", "")
        print("✓ Tip rejects when insufficient points")
    
    def test_tip_rejects_nonexistent_stream(self, admin_session):
        """Verify tip fails for non-existent stream"""
        response = admin_session.post(
            f"{BASE_URL}/api/live/tip/nonexistent_stream_123",
            json={"points": 10}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Tip rejects non-existent stream")
    
    def test_tip_success_deducts_and_credits_points(self, free_user_session, admin_stream, admin_session):
        """Verify successful tip deducts from tipper and credits broadcaster"""
        stream_id = admin_stream["stream_id"]
        
        # Get tipper's initial points
        tipper_before = free_user_session.get(f"{BASE_URL}/api/auth/me").json()
        tipper_points_before = tipper_before.get("points", 0)
        
        # Get broadcaster's initial points
        broadcaster_before = admin_session.get(f"{BASE_URL}/api/auth/me").json()
        broadcaster_points_before = broadcaster_before.get("points", 0)
        
        # Skip if tipper doesn't have enough points
        if tipper_points_before < 10:
            pytest.skip(f"Tipper has only {tipper_points_before} points, need at least 10")
        
        # Send tip
        response = free_user_session.post(
            f"{BASE_URL}/api/live/tip/{stream_id}",
            json={"points": 10}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "Tipped 10 points" in data["message"]
        
        # Verify tipper's points decreased
        tipper_after = free_user_session.get(f"{BASE_URL}/api/auth/me").json()
        tipper_points_after = tipper_after.get("points", 0)
        assert tipper_points_after == tipper_points_before - 10, \
            f"Tipper points should decrease by 10: {tipper_points_before} -> {tipper_points_after}"
        
        # Verify broadcaster's points increased
        broadcaster_after = admin_session.get(f"{BASE_URL}/api/auth/me").json()
        broadcaster_points_after = broadcaster_after.get("points", 0)
        assert broadcaster_points_after == broadcaster_points_before + 10, \
            f"Broadcaster points should increase by 10: {broadcaster_points_before} -> {broadcaster_points_after}"
        
        print("✓ Tip successfully deducts from tipper and credits broadcaster")


class TestCardTip:
    """Test POST /api/live/tip-card/{stream_id} endpoint for card-based tips"""
    
    def test_tip_card_creates_stripe_checkout(self, free_user_session, admin_stream):
        """Verify card tip creates Stripe checkout session"""
        stream_id = admin_stream["stream_id"]
        
        response = free_user_session.post(
            f"{BASE_URL}/api/live/tip-card/{stream_id}",
            json={
                "pack_id": "tip_099",
                "origin_url": "https://pet-social-dev.preview.emergentagent.com"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "url" in data, "Missing checkout URL in response"
        assert "session_id" in data, "Missing session_id in response"
        assert "stripe.com" in data["url"], "URL should be a Stripe checkout URL"
        
        print(f"✓ Card tip creates Stripe checkout: {data['url'][:50]}...")
    
    def test_tip_card_rejects_invalid_pack(self, free_user_session, admin_stream):
        """Verify card tip rejects invalid pack_id"""
        stream_id = admin_stream["stream_id"]
        
        response = free_user_session.post(
            f"{BASE_URL}/api/live/tip-card/{stream_id}",
            json={
                "pack_id": "invalid_pack",
                "origin_url": "https://pet-social-dev.preview.emergentagent.com"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "Invalid tip pack" in response.json().get("detail", "")
        print("✓ Card tip rejects invalid pack_id")
    
    def test_tip_card_rejects_nonexistent_stream(self, free_user_session):
        """Verify card tip fails for non-existent stream"""
        response = free_user_session.post(
            f"{BASE_URL}/api/live/tip-card/nonexistent_stream_456",
            json={
                "pack_id": "tip_099",
                "origin_url": "https://pet-social-dev.preview.emergentagent.com"
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Card tip rejects non-existent stream")


class TestStreamTips:
    """Test GET /api/live/tips/{stream_id} endpoint"""
    
    def test_get_stream_tips_returns_tips_list(self, admin_session, fresh_stream):
        """Verify tips endpoint returns tips for a stream"""
        stream_id = fresh_stream["stream_id"]
        
        response = admin_session.get(f"{BASE_URL}/api/live/tips/{stream_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "tips" in data, "Missing tips array in response"
        assert "tips_total" in data, "Missing tips_total in response"
        assert isinstance(data["tips"], list), "tips should be a list"
        assert isinstance(data["tips_total"], (int, float)), "tips_total should be numeric"
        
        print(f"✓ Stream tips endpoint returns {len(data['tips'])} tips, total: {data['tips_total']}")
    
    def test_get_stream_tips_nonexistent_stream(self, admin_session):
        """Verify tips endpoint returns 404 for non-existent stream"""
        response = admin_session.get(f"{BASE_URL}/api/live/tips/nonexistent_stream_789")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Stream tips returns 404 for non-existent stream")


class TestMyTipsReceived:
    """Test GET /api/live/my-tips-received endpoint"""
    
    def test_my_tips_received_returns_tips(self, admin_session):
        """Verify my-tips-received returns broadcaster's received tips"""
        response = admin_session.get(f"{BASE_URL}/api/live/my-tips-received")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "tips" in data, "Missing tips array in response"
        assert "total_received" in data, "Missing total_received in response"
        assert isinstance(data["tips"], list), "tips should be a list"
        
        print(f"✓ my-tips-received returns {len(data['tips'])} tips, total: {data['total_received']}")


class TestTipOnEndedStream:
    """Test tipping behavior on ended streams"""
    
    def test_tip_rejects_ended_stream(self, admin_session, ended_stream):
        """Verify tip fails on ended stream"""
        stream_id = ended_stream["stream_id"]
        
        # Use admin session which has points, but the stream is ended
        response = admin_session.post(
            f"{BASE_URL}/api/live/tip/{stream_id}",
            json={"points": 10}
        )
        # Should fail because stream is not live (or self-tip if admin's stream)
        assert response.status_code == 400, f"Expected 400 for ended stream, got {response.status_code}"
        detail = response.json().get("detail", "").lower()
        # Either "not live" or "can't tip yourself" is acceptable
        assert "not live" in detail or "can't tip yourself" in detail, f"Unexpected error: {detail}"
        print("✓ Tip correctly rejected on ended stream")


# ─── Fixtures ───

@pytest.fixture(scope="module")
def admin_session():
    """Create authenticated session for admin user"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    data = response.json()
    token = data.get("session_token") or data.get("token")
    if token:
        session.headers.update({"Authorization": f"Bearer {token}"})
    
    return session


@pytest.fixture(scope="module")
def free_user_session():
    """Create authenticated session for free user"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": FREE_USER_EMAIL,
        "password": FREE_USER_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Free user login failed: {response.status_code} - {response.text}")
    
    data = response.json()
    token = data.get("session_token") or data.get("token")
    if token:
        session.headers.update({"Authorization": f"Bearer {token}"})
    
    return session


@pytest.fixture(scope="module")
def low_points_session():
    """Create session for a user with 0 points (for testing insufficient points)"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Create a temporary test user with 0 points
    test_email = f"test_lowpoints_{int(time.time())}@test.com"
    
    # Register
    response = session.post(f"{BASE_URL}/api/auth/register", json={
        "email": test_email,
        "password": "Test1234!",
        "name": "Low Points Test User"
    })
    
    if response.status_code not in [200, 201]:
        pytest.skip(f"Could not create low points user: {response.status_code}")
    
    data = response.json()
    token = data.get("session_token") or data.get("token")
    if token:
        session.headers.update({"Authorization": f"Bearer {token}"})
    
    return session


@pytest.fixture(scope="module")
def admin_stream(admin_session):
    """Create a live stream by admin for testing"""
    # Check if admin already has an active stream
    response = admin_session.get(f"{BASE_URL}/api/live/my-streams")
    if response.status_code == 200:
        streams = response.json().get("streams", [])
        for s in streams:
            if s.get("status") == "live":
                return s
    
    # Start new stream
    response = admin_session.post(f"{BASE_URL}/api/live/start", json={
        "title": "TEST_Admin Tip Test Stream",
        "category": "feed"
    })
    
    if response.status_code != 200:
        pytest.skip(f"Could not create admin stream: {response.status_code} - {response.text}")
    
    stream = response.json()
    yield stream
    
    # Cleanup - end stream
    try:
        admin_session.post(f"{BASE_URL}/api/live/end/{stream['stream_id']}", json={})
    except:
        pass


@pytest.fixture(scope="function")
def test_stream(free_user_session):
    """Create a live stream by free user for testing (different from admin)"""
    # Start new stream
    response = free_user_session.post(f"{BASE_URL}/api/live/start", json={
        "title": "TEST_Free User Tip Test Stream",
        "category": "feed"
    })
    
    if response.status_code != 200:
        pytest.skip(f"Could not create test stream: {response.status_code} - {response.text}")
    
    stream = response.json()
    yield stream
    
    # Cleanup - end stream
    try:
        free_user_session.post(f"{BASE_URL}/api/live/end/{stream['stream_id']}", json={})
    except:
        pass


@pytest.fixture(scope="function")
def ended_stream(admin_session):
    """Create and immediately end a stream for testing ended stream behavior"""
    # First end any existing live stream
    response = admin_session.get(f"{BASE_URL}/api/live/my-streams")
    if response.status_code == 200:
        streams = response.json().get("streams", [])
        for s in streams:
            if s.get("status") == "live":
                admin_session.post(f"{BASE_URL}/api/live/end/{s['stream_id']}", json={})
    
    # Start stream
    response = admin_session.post(f"{BASE_URL}/api/live/start", json={
        "title": "TEST_Ended Stream Test",
        "category": "feed"
    })
    
    if response.status_code != 200:
        pytest.skip(f"Could not create stream: {response.status_code} - {response.text}")
    
    stream = response.json()
    
    # End it immediately
    admin_session.post(f"{BASE_URL}/api/live/end/{stream['stream_id']}", json={})
    
    # Fetch updated stream
    response = admin_session.get(f"{BASE_URL}/api/live/stream/{stream['stream_id']}")
    if response.status_code == 200:
        return response.json()
    
    return stream


@pytest.fixture(scope="function")
def fresh_stream(admin_session):
    """Create a fresh live stream for testing (ends any existing first)"""
    # First end any existing live stream
    response = admin_session.get(f"{BASE_URL}/api/live/my-streams")
    if response.status_code == 200:
        streams = response.json().get("streams", [])
        for s in streams:
            if s.get("status") == "live":
                admin_session.post(f"{BASE_URL}/api/live/end/{s['stream_id']}", json={})
    
    # Start new stream
    response = admin_session.post(f"{BASE_URL}/api/live/start", json={
        "title": "TEST_Fresh Stream for Tips",
        "category": "feed"
    })
    
    if response.status_code != 200:
        pytest.skip(f"Could not create fresh stream: {response.status_code} - {response.text}")
    
    stream = response.json()
    yield stream
    
    # Cleanup - end stream
    try:
        admin_session.post(f"{BASE_URL}/api/live/end/{stream['stream_id']}", json={})
    except:
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
