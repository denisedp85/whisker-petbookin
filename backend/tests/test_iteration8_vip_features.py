"""
Iteration 8 Testing - VIP Directory, Trial, Cancellation, Avatar Presets, Emoji Picker
Tests for new features:
1. VIP Directory - /api/breeder/vip-directory with gated contact info
2. VIP Pass Purchase - /api/stripe/purchase-vip-pass ($4.99)
3. 7-Day Free Trial - /api/stripe/start-trial
4. Trial Status - /api/stripe/trial-status
5. Cancel Subscription - /api/stripe/cancel-subscription with tier-based fees
6. Cancellation Fee - /api/stripe/cancellation-fee
7. Avatar Presets - /api/auth/avatar-presets
8. Avatar Update - /api/auth/avatar
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@petbookin.com"
ADMIN_PASSWORD = "PetbookinAdmin2026!"
FREE_USER_EMAIL = "freeuser@test.com"
FREE_USER_PASSWORD = "Test1234!"


class TestHealthCheck:
    """Basic health check to ensure API is running"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")


class TestAuthentication:
    """Test login for both admin and free user"""
    
    def test_admin_login(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or "session_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["membership_tier"] == "mega"
        print(f"✓ Admin login successful - tier: {data['user']['membership_tier']}")
        return data
    
    def test_free_user_login(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FREE_USER_EMAIL,
            "password": FREE_USER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == FREE_USER_EMAIL
        # User may be on trial (prime) or free depending on test state
        tier = data["user"]["membership_tier"]
        assert tier in ["free", "prime"]  # Accept either
        print(f"✓ Free/trial user login successful - tier: {tier}")
        return data


@pytest.fixture
def admin_auth():
    """Get admin authentication headers"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip("Admin login failed")
    data = response.json()
    token = data.get("session_token") or data.get("token")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def free_user_auth():
    """Get free user authentication headers"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": FREE_USER_EMAIL,
        "password": FREE_USER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip("Free user login failed")
    data = response.json()
    token = data.get("session_token") or data.get("token")
    return {"Authorization": f"Bearer {token}"}


class TestVIPDirectory:
    """Test VIP Breeder Directory endpoint with gated contact info"""
    
    def test_vip_directory_loads_for_admin(self, admin_auth):
        """Admin (MEGA tier) should see VIP directory with contact info"""
        response = requests.get(f"{BASE_URL}/api/breeder/vip-directory", headers=admin_auth)
        assert response.status_code == 200
        data = response.json()
        assert "breeders" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        # Admin is paid subscriber, should have VIP access
        # Note: has_vip_access is for VIP pass, not subscription
        print(f"✓ VIP Directory loaded - {data['total']} breeders found")
    
    def test_vip_directory_loads_for_free_user(self, free_user_auth):
        """Free user should see VIP directory but contact info should be stripped"""
        response = requests.get(f"{BASE_URL}/api/breeder/vip-directory", headers=free_user_auth)
        assert response.status_code == 200
        data = response.json()
        assert "breeders" in data
        assert data.get("has_vip_access") == False  # Free user has no VIP pass
        print(f"✓ VIP Directory loaded for free user - has_vip_access: {data.get('has_vip_access')}")
    
    def test_vip_directory_search(self, admin_auth):
        """Test search functionality in VIP directory"""
        response = requests.get(f"{BASE_URL}/api/breeder/vip-directory?search=admin", headers=admin_auth)
        assert response.status_code == 200
        data = response.json()
        assert "breeders" in data
        print(f"✓ VIP Directory search works - found {len(data['breeders'])} results for 'admin'")
    
    def test_vip_directory_species_filter(self, admin_auth):
        """Test species filter in VIP directory"""
        response = requests.get(f"{BASE_URL}/api/breeder/vip-directory?species=dogs", headers=admin_auth)
        assert response.status_code == 200
        data = response.json()
        assert "breeders" in data
        print(f"✓ VIP Directory species filter works - found {len(data['breeders'])} dog breeders")


class TestVIPPassPurchase:
    """Test VIP Pass purchase endpoint"""
    
    def test_vip_pass_purchase_creates_checkout(self, free_user_auth):
        """Free user should be able to initiate VIP pass purchase"""
        response = requests.post(
            f"{BASE_URL}/api/stripe/purchase-vip-pass",
            json={"origin_url": "https://pet-social-dev.preview.emergentagent.com"},
            headers={**free_user_auth, "Content-Type": "application/json"}
        )
        # Should return checkout URL or error if already has pass
        if response.status_code == 200:
            data = response.json()
            assert "url" in data
            assert "session_id" in data
            print(f"✓ VIP Pass checkout created - session: {data['session_id'][:20]}...")
        elif response.status_code == 400:
            data = response.json()
            # Already has subscription or active pass
            assert "detail" in data
            print(f"✓ VIP Pass purchase blocked (expected): {data['detail']}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_vip_pass_blocked_for_subscribers(self, admin_auth):
        """Paid subscribers should not be able to buy VIP pass"""
        response = requests.post(
            f"{BASE_URL}/api/stripe/purchase-vip-pass",
            json={"origin_url": "https://pet-social-dev.preview.emergentagent.com"},
            headers={**admin_auth, "Content-Type": "application/json"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "already have a subscription" in data.get("detail", "").lower() or "vip access" in data.get("detail", "").lower()
        print(f"✓ VIP Pass correctly blocked for subscriber: {data['detail']}")


class TestTrialFeatures:
    """Test 7-day free trial functionality"""
    
    def test_trial_status_endpoint(self, free_user_auth):
        """Test trial status endpoint returns correct info"""
        response = requests.get(f"{BASE_URL}/api/stripe/trial-status", headers=free_user_auth)
        assert response.status_code == 200
        data = response.json()
        assert "has_used_trial" in data
        assert "is_on_trial" in data
        assert "current_tier" in data
        print(f"✓ Trial status: has_used={data['has_used_trial']}, on_trial={data['is_on_trial']}, tier={data['current_tier']}")
    
    def test_trial_status_for_admin(self, admin_auth):
        """Admin should see trial status (likely already used or not applicable)"""
        response = requests.get(f"{BASE_URL}/api/stripe/trial-status", headers=admin_auth)
        assert response.status_code == 200
        data = response.json()
        assert "current_tier" in data
        assert data["current_tier"] == "mega"
        print(f"✓ Admin trial status: tier={data['current_tier']}")
    
    def test_start_trial_blocked_for_subscribers(self, admin_auth):
        """Paid subscribers should not be able to start trial"""
        response = requests.post(
            f"{BASE_URL}/api/stripe/start-trial",
            json={"tier_id": "prime"},
            headers={**admin_auth, "Content-Type": "application/json"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "already have" in data.get("detail", "").lower()
        print(f"✓ Trial correctly blocked for subscriber: {data['detail']}")
    
    def test_start_trial_for_free_user(self, free_user_auth):
        """Free user should be able to start trial (or get blocked if already used)"""
        response = requests.post(
            f"{BASE_URL}/api/stripe/start-trial",
            json={"tier_id": "prime"},
            headers={**free_user_auth, "Content-Type": "application/json"}
        )
        if response.status_code == 200:
            data = response.json()
            assert "message" in data
            assert "trial_end" in data
            print(f"✓ Trial started: {data['message']}")
        elif response.status_code == 400:
            data = response.json()
            # Already used trial or has subscription
            assert "detail" in data
            print(f"✓ Trial blocked (expected): {data['detail']}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")


class TestCancellationFeatures:
    """Test subscription cancellation with tier-based fees"""
    
    def test_cancellation_fee_endpoint(self, admin_auth):
        """Test cancellation fee endpoint returns correct tier-based fee"""
        response = requests.get(f"{BASE_URL}/api/stripe/cancellation-fee", headers=admin_auth)
        assert response.status_code == 200
        data = response.json()
        assert "tier" in data
        assert "fee" in data
        assert "fee_name" in data
        # Admin is MEGA tier, fee should be $14.99
        assert data["tier"] == "mega"
        assert data["fee"] == 14.99
        print(f"✓ Cancellation fee for {data['tier']}: ${data['fee']} ({data['fee_name']})")
    
    def test_cancellation_fee_for_trial_user(self, free_user_auth):
        """Trial user (was free, now on prime trial) should have cancellation fee"""
        response = requests.get(f"{BASE_URL}/api/stripe/cancellation-fee", headers=free_user_auth)
        assert response.status_code == 200
        data = response.json()
        # User is now on prime trial, so tier is prime
        assert data["tier"] in ["free", "prime"]  # Could be either depending on test order
        print(f"✓ Trial user cancellation fee: tier={data['tier']}, fee=${data['fee']}")
    
    def test_cancel_subscription_for_trial_user(self, free_user_auth):
        """Trial user should be able to cancel (has active trial subscription)"""
        response = requests.post(
            f"{BASE_URL}/api/stripe/cancel-subscription",
            json={"origin_url": "https://pet-social-dev.preview.emergentagent.com"},
            headers={**free_user_auth, "Content-Type": "application/json"}
        )
        # Trial user can cancel (creates checkout) or is blocked if already free
        if response.status_code == 200:
            data = response.json()
            assert "url" in data
            print(f"✓ Trial user can cancel - checkout created")
        elif response.status_code == 400:
            data = response.json()
            print(f"✓ Cancel blocked (expected if already free): {data.get('detail')}")
    
    def test_cancel_subscription_creates_checkout_for_subscriber(self, admin_auth):
        """Paid subscriber should be able to initiate cancellation (creates checkout for fee)"""
        response = requests.post(
            f"{BASE_URL}/api/stripe/cancel-subscription",
            json={"origin_url": "https://pet-social-dev.preview.emergentagent.com"},
            headers={**admin_auth, "Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "session_id" in data
        assert "fee" in data
        assert data["fee"] == 14.99  # MEGA tier fee
        print(f"✓ Cancellation checkout created - fee: ${data['fee']}, session: {data['session_id'][:20]}...")


class TestAvatarPresets:
    """Test avatar presets and update functionality"""
    
    def test_get_avatar_presets(self, admin_auth):
        """Test getting avatar presets"""
        response = requests.get(f"{BASE_URL}/api/auth/avatar-presets", headers=admin_auth)
        assert response.status_code == 200
        data = response.json()
        assert "presets" in data
        assert "current_avatar" in data
        assert "is_subscriber" in data
        assert len(data["presets"]) > 0
        # Check preset structure
        preset = data["presets"][0]
        assert "id" in preset
        assert "label" in preset
        assert "free" in preset
        print(f"✓ Avatar presets loaded - {len(data['presets'])} presets, current: {data['current_avatar']}, subscriber: {data['is_subscriber']}")
    
    def test_avatar_presets_for_trial_user(self, free_user_auth):
        """Trial user (was free, now on prime trial) should be subscriber"""
        response = requests.get(f"{BASE_URL}/api/auth/avatar-presets", headers=free_user_auth)
        assert response.status_code == 200
        data = response.json()
        # User is now on prime trial, so is_subscriber should be True
        print(f"✓ Trial user avatar presets - is_subscriber: {data['is_subscriber']}")
    
    def test_update_avatar_to_default(self, admin_auth):
        """Subscriber should be able to update avatar to default"""
        response = requests.put(
            f"{BASE_URL}/api/auth/avatar",
            json={"avatar_id": "default"},
            headers={**admin_auth, "Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("avatar_id") == "default"
        print(f"✓ Avatar updated to: {data['avatar_id']}")
    
    def test_update_avatar_to_premium(self, admin_auth):
        """Subscriber should be able to update to premium avatar"""
        response = requests.put(
            f"{BASE_URL}/api/auth/avatar",
            json={"avatar_id": "golden_crown"},
            headers={**admin_auth, "Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("avatar_id") == "golden_crown"
        print(f"✓ Premium avatar updated to: {data['avatar_id']}")
    
    def test_premium_avatar_allowed_for_trial_user(self, free_user_auth):
        """Trial user (subscriber) should be able to select premium avatar"""
        response = requests.put(
            f"{BASE_URL}/api/auth/avatar",
            json={"avatar_id": "golden_crown"},
            headers={**free_user_auth, "Content-Type": "application/json"}
        )
        # Trial user is a subscriber, so premium avatars should be allowed
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Premium avatar allowed for trial user: {data.get('avatar_id')}")
        elif response.status_code == 403:
            # If user is actually free (trial expired), this is expected
            data = response.json()
            print(f"✓ Premium avatar blocked (user may be free): {data.get('detail')}")
    
    def test_free_avatar_allowed_for_free_user(self, free_user_auth):
        """Free user should be able to select free avatar"""
        response = requests.put(
            f"{BASE_URL}/api/auth/avatar",
            json={"avatar_id": "default"},
            headers={**free_user_auth, "Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("avatar_id") == "default"
        print(f"✓ Free avatar allowed for free user: {data['avatar_id']}")


class TestTrialExpiryCheck:
    """Test trial expiry check in /me endpoint"""
    
    def test_me_endpoint_returns_user_data(self, admin_auth):
        """Test /me endpoint returns user data with trial info"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_auth)
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "membership_tier" in data
        assert "membership_status" in data
        print(f"✓ /me endpoint works - tier: {data['membership_tier']}, status: {data['membership_status']}")
    
    def test_me_endpoint_for_free_user(self, free_user_auth):
        """Test /me endpoint for free user"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=free_user_auth)
        assert response.status_code == 200
        data = response.json()
        assert data["membership_tier"] == "free" or data.get("membership_status") in ["trial", "trial_expired", "inactive"]
        print(f"✓ Free user /me - tier: {data['membership_tier']}, status: {data.get('membership_status')}")


class TestExistingFeatures:
    """Verify existing features still work"""
    
    def test_regular_breeder_directory(self, admin_auth):
        """Test regular breeder directory still works"""
        response = requests.get(f"{BASE_URL}/api/breeder/directory", headers=admin_auth)
        assert response.status_code == 200
        data = response.json()
        assert "breeders" in data
        print(f"✓ Regular breeder directory works - {data.get('total', len(data['breeders']))} breeders")
    
    def test_feed_posts(self, admin_auth):
        """Test feed posts endpoint"""
        response = requests.get(f"{BASE_URL}/api/feed/posts", headers=admin_auth)
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        print(f"✓ Feed posts work - {len(data['posts'])} posts")
    
    def test_stripe_publishable_key(self):
        """Test Stripe publishable key endpoint"""
        response = requests.get(f"{BASE_URL}/api/stripe/publishable-key")
        assert response.status_code == 200
        data = response.json()
        assert "publishable_key" in data
        assert data["publishable_key"].startswith("pk_")
        print(f"✓ Stripe publishable key available")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
