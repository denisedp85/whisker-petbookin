"""
Stripe Integration Tests for Petbookin
Tests: create-checkout-session, checkout-status, publishable-key, webhook endpoints
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@petbookin.com"
ADMIN_PASSWORD = "PetbookinAdmin2026!"

# Tier configurations
TIER_PACKAGES = {
    "prime": {"name": "Prime", "amount": 4.99, "interval": "week"},
    "pro": {"name": "Pro", "amount": 14.99, "interval": "month"},
    "ultra": {"name": "Ultra", "amount": 24.99, "interval": "month"},
    "mega": {"name": "Mega", "amount": 39.99, "interval": "month"},
}


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    return data.get("session_token") or data.get("token")


@pytest.fixture(scope="module")
def authenticated_client(api_client, admin_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


class TestHealthAndAuth:
    """Basic health and auth tests"""
    
    def test_health_check(self, api_client):
        """Test health endpoint"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["app"] == "Petbookin"
        print("✓ Health check passed")
    
    def test_admin_login(self, api_client):
        """Test admin login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or "session_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["membership_tier"] == "mega"
        print(f"✓ Admin login passed - tier: {data['user']['membership_tier']}")
    
    def test_auth_me(self, authenticated_client):
        """Test /auth/me endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["membership_tier"] == "mega"
        print("✓ Auth /me endpoint passed")


class TestStripePublishableKey:
    """Test Stripe publishable key endpoint"""
    
    def test_get_publishable_key(self, api_client):
        """Test GET /api/stripe/publishable-key"""
        response = api_client.get(f"{BASE_URL}/api/stripe/publishable-key")
        assert response.status_code == 200
        data = response.json()
        assert "publishable_key" in data
        assert data["publishable_key"].startswith("pk_test_")
        print(f"✓ Publishable key returned: {data['publishable_key'][:20]}...")


class TestCreateCheckoutSession:
    """Test create-checkout-session endpoint"""
    
    def test_create_checkout_session_prime(self, authenticated_client):
        """Test creating checkout session for Prime tier"""
        response = authenticated_client.post(f"{BASE_URL}/api/stripe/create-checkout-session", json={
            "tier_id": "prime",
            "origin_url": "https://pet-social-dev.preview.emergentagent.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "session_id" in data
        assert data["url"].startswith("https://checkout.stripe.com")
        assert data["session_id"].startswith("cs_test_")
        print(f"✓ Prime checkout session created: {data['session_id'][:30]}...")
    
    def test_create_checkout_session_pro(self, authenticated_client):
        """Test creating checkout session for Pro tier"""
        response = authenticated_client.post(f"{BASE_URL}/api/stripe/create-checkout-session", json={
            "tier_id": "pro",
            "origin_url": "https://pet-social-dev.preview.emergentagent.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "session_id" in data
        assert data["url"].startswith("https://checkout.stripe.com")
        print(f"✓ Pro checkout session created: {data['session_id'][:30]}...")
    
    def test_create_checkout_session_ultra(self, authenticated_client):
        """Test creating checkout session for Ultra tier"""
        response = authenticated_client.post(f"{BASE_URL}/api/stripe/create-checkout-session", json={
            "tier_id": "ultra",
            "origin_url": "https://pet-social-dev.preview.emergentagent.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "session_id" in data
        assert data["url"].startswith("https://checkout.stripe.com")
        print(f"✓ Ultra checkout session created: {data['session_id'][:30]}...")
    
    def test_create_checkout_session_mega(self, authenticated_client):
        """Test creating checkout session for Mega tier"""
        response = authenticated_client.post(f"{BASE_URL}/api/stripe/create-checkout-session", json={
            "tier_id": "mega",
            "origin_url": "https://pet-social-dev.preview.emergentagent.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "session_id" in data
        assert data["url"].startswith("https://checkout.stripe.com")
        print(f"✓ Mega checkout session created: {data['session_id'][:30]}...")
    
    def test_create_checkout_session_invalid_tier(self, authenticated_client):
        """Test creating checkout session with invalid tier"""
        response = authenticated_client.post(f"{BASE_URL}/api/stripe/create-checkout-session", json={
            "tier_id": "invalid_tier",
            "origin_url": "https://pet-social-dev.preview.emergentagent.com"
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "Invalid tier" in data["detail"]
        print("✓ Invalid tier correctly rejected")
    
    def test_create_checkout_session_no_auth(self, api_client):
        """Test creating checkout session without authentication"""
        # Create a new session without auth header
        no_auth_client = requests.Session()
        no_auth_client.headers.update({"Content-Type": "application/json"})
        response = no_auth_client.post(f"{BASE_URL}/api/stripe/create-checkout-session", json={
            "tier_id": "prime",
            "origin_url": "https://pet-social-dev.preview.emergentagent.com"
        })
        assert response.status_code in [401, 403]
        print("✓ Unauthenticated request correctly rejected")


class TestCheckoutStatus:
    """Test checkout-status endpoint"""
    
    def test_checkout_status_valid_session(self, authenticated_client):
        """Test getting status of a valid checkout session"""
        # First create a session
        create_response = authenticated_client.post(f"{BASE_URL}/api/stripe/create-checkout-session", json={
            "tier_id": "prime",
            "origin_url": "https://pet-social-dev.preview.emergentagent.com"
        })
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]
        
        # Then check its status
        status_response = authenticated_client.get(f"{BASE_URL}/api/stripe/checkout-status/{session_id}")
        assert status_response.status_code == 200
        data = status_response.json()
        
        # Verify response structure
        assert "status" in data
        assert "payment_status" in data
        assert "amount_total" in data
        assert "currency" in data
        assert "tier_id" in data
        assert "tier_name" in data
        
        # Verify values
        assert data["status"] == "open"
        assert data["payment_status"] == "unpaid"
        assert data["amount_total"] == 499  # $4.99 in cents
        assert data["currency"] == "usd"
        assert data["tier_id"] == "prime"
        assert data["tier_name"] == "Prime"
        print(f"✓ Checkout status returned correctly: {data['status']}, {data['payment_status']}")
    
    def test_checkout_status_invalid_session(self, authenticated_client):
        """Test getting status of an invalid session"""
        response = authenticated_client.get(f"{BASE_URL}/api/stripe/checkout-status/invalid_session_id")
        # Should return 404 or error from Stripe
        assert response.status_code in [404, 500]
        print("✓ Invalid session correctly handled")
    
    def test_checkout_status_no_auth(self, api_client):
        """Test getting checkout status without authentication"""
        no_auth_client = requests.Session()
        no_auth_client.headers.update({"Content-Type": "application/json"})
        response = no_auth_client.get(f"{BASE_URL}/api/stripe/checkout-status/some_session_id")
        assert response.status_code in [401, 403]
        print("✓ Unauthenticated status request correctly rejected")


class TestStripeWebhook:
    """Test Stripe webhook endpoint"""
    
    def test_webhook_endpoint_exists(self, api_client):
        """Test that webhook endpoint exists and responds"""
        # Webhook without proper signature should fail gracefully
        response = api_client.post(f"{BASE_URL}/api/webhook/stripe", 
            data="{}",
            headers={"Content-Type": "application/json", "Stripe-Signature": "invalid"}
        )
        # Should return 200 with error status (graceful handling) or 400
        assert response.status_code in [200, 400]
        print(f"✓ Webhook endpoint exists and responds: {response.status_code}")


class TestPaymentTransactionsCollection:
    """Test that payment_transactions collection is properly created"""
    
    def test_transaction_created_on_checkout(self, authenticated_client):
        """Test that a transaction record is created when checkout session is initiated"""
        # Create a checkout session
        response = authenticated_client.post(f"{BASE_URL}/api/stripe/create-checkout-session", json={
            "tier_id": "ultra",
            "origin_url": "https://pet-social-dev.preview.emergentagent.com"
        })
        assert response.status_code == 200
        session_id = response.json()["session_id"]
        
        # Verify by checking status (which queries the transaction)
        status_response = authenticated_client.get(f"{BASE_URL}/api/stripe/checkout-status/{session_id}")
        assert status_response.status_code == 200
        data = status_response.json()
        
        # If we can get status, the transaction was created
        assert data["tier_id"] == "ultra"
        assert data["tier_name"] == "Ultra"
        print(f"✓ Transaction record created for session: {session_id[:30]}...")


class TestTierAmounts:
    """Test that tier amounts are correct"""
    
    def test_prime_amount(self, authenticated_client):
        """Test Prime tier amount ($4.99/week)"""
        response = authenticated_client.post(f"{BASE_URL}/api/stripe/create-checkout-session", json={
            "tier_id": "prime",
            "origin_url": "https://pet-social-dev.preview.emergentagent.com"
        })
        assert response.status_code == 200
        session_id = response.json()["session_id"]
        
        status_response = authenticated_client.get(f"{BASE_URL}/api/stripe/checkout-status/{session_id}")
        assert status_response.status_code == 200
        data = status_response.json()
        assert data["amount_total"] == 499  # $4.99 in cents
        print("✓ Prime tier amount correct: $4.99")
    
    def test_pro_amount(self, authenticated_client):
        """Test Pro tier amount ($14.99/month)"""
        response = authenticated_client.post(f"{BASE_URL}/api/stripe/create-checkout-session", json={
            "tier_id": "pro",
            "origin_url": "https://pet-social-dev.preview.emergentagent.com"
        })
        assert response.status_code == 200
        session_id = response.json()["session_id"]
        
        status_response = authenticated_client.get(f"{BASE_URL}/api/stripe/checkout-status/{session_id}")
        assert status_response.status_code == 200
        data = status_response.json()
        assert data["amount_total"] == 1499  # $14.99 in cents
        print("✓ Pro tier amount correct: $14.99")
    
    def test_ultra_amount(self, authenticated_client):
        """Test Ultra tier amount ($24.99/month)"""
        response = authenticated_client.post(f"{BASE_URL}/api/stripe/create-checkout-session", json={
            "tier_id": "ultra",
            "origin_url": "https://pet-social-dev.preview.emergentagent.com"
        })
        assert response.status_code == 200
        session_id = response.json()["session_id"]
        
        status_response = authenticated_client.get(f"{BASE_URL}/api/stripe/checkout-status/{session_id}")
        assert status_response.status_code == 200
        data = status_response.json()
        assert data["amount_total"] == 2499  # $24.99 in cents
        print("✓ Ultra tier amount correct: $24.99")
    
    def test_mega_amount(self, authenticated_client):
        """Test Mega tier amount ($39.99/month)"""
        response = authenticated_client.post(f"{BASE_URL}/api/stripe/create-checkout-session", json={
            "tier_id": "mega",
            "origin_url": "https://pet-social-dev.preview.emergentagent.com"
        })
        assert response.status_code == 200
        session_id = response.json()["session_id"]
        
        status_response = authenticated_client.get(f"{BASE_URL}/api/stripe/checkout-status/{session_id}")
        assert status_response.status_code == 200
        data = status_response.json()
        assert data["amount_total"] == 3999  # $39.99 in cents
        print("✓ Mega tier amount correct: $39.99")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
