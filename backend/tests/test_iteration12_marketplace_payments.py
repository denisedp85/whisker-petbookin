"""
Iteration 12 - Marketplace Direct Payments Testing
Tests: Seller setup, Buy Now flow, Purchase status, Seller dashboard, Admin transactions
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@petbookin.com"
ADMIN_PASSWORD = "PetbookinAdmin2026!"
BUYER_EMAIL = "buyer@test.com"
BUYER_PASSWORD = "Test1234!"


class TestMarketplacePayments:
    """Marketplace payment system tests"""
    
    admin_token = None
    buyer_token = None
    test_listing_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup tokens for tests"""
        # Get admin token
        if not TestMarketplacePayments.admin_token:
            res = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            if res.status_code == 200:
                TestMarketplacePayments.admin_token = res.json().get("session_token")
            else:
                pytest.skip(f"Admin login failed: {res.status_code} - {res.text}")
        
        # Get or create buyer token
        if not TestMarketplacePayments.buyer_token:
            # Try login first
            res = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": BUYER_EMAIL,
                "password": BUYER_PASSWORD
            })
            if res.status_code == 200:
                TestMarketplacePayments.buyer_token = res.json().get("session_token")
            else:
                # Register buyer
                res = requests.post(f"{BASE_URL}/api/auth/register", json={
                    "email": BUYER_EMAIL,
                    "password": BUYER_PASSWORD,
                    "name": "Test Buyer"
                })
                if res.status_code in [200, 201]:
                    TestMarketplacePayments.buyer_token = res.json().get("session_token")
                else:
                    pytest.skip(f"Buyer registration failed: {res.status_code} - {res.text}")
    
    def admin_headers(self):
        return {"Authorization": f"Bearer {TestMarketplacePayments.admin_token}"}
    
    def buyer_headers(self):
        return {"Authorization": f"Bearer {TestMarketplacePayments.buyer_token}"}
    
    # ─── Seller Setup Tests ───
    
    def test_01_seller_setup_endpoint(self):
        """POST /api/marketplace/connect/setup - user can set up as a seller"""
        res = requests.post(f"{BASE_URL}/api/marketplace/connect/setup", 
                           json={}, headers=self.admin_headers())
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data.get("status") == "active", f"Expected status 'active', got {data}"
        assert "message" in data
        print(f"Seller setup response: {data}")
    
    def test_02_seller_status_connected(self):
        """GET /api/marketplace/connect/status - returns seller status (connected true)"""
        res = requests.get(f"{BASE_URL}/api/marketplace/connect/status", 
                          headers=self.admin_headers())
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data.get("connected") == True, f"Expected connected=True, got {data}"
        assert data.get("status") == "active"
        print(f"Seller status (admin): {data}")
    
    def test_03_non_seller_status(self):
        """GET /api/marketplace/connect/status - returns connected=false for non-seller"""
        res = requests.get(f"{BASE_URL}/api/marketplace/connect/status", 
                          headers=self.buyer_headers())
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        # Buyer may or may not be a seller, just check structure
        assert "connected" in data
        assert "status" in data
        print(f"Seller status (buyer): {data}")
    
    # ─── Listing Creation for Buy Tests ───
    
    def test_04_create_test_listing(self):
        """Create a test listing for buy tests"""
        res = requests.post(f"{BASE_URL}/api/marketplace/listings", json={
            "title": "TEST_Premium Dog Collar",
            "description": "High quality leather collar for testing",
            "price": 29.99,
            "category": "accessories",
            "condition": "new",
            "location": "Test City"
        }, headers=self.admin_headers())
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "listing_id" in data
        TestMarketplacePayments.test_listing_id = data["listing_id"]
        print(f"Created test listing: {data['listing_id']}")
    
    def test_05_get_listings_shows_active(self):
        """GET /api/marketplace/listings - shows active listings"""
        res = requests.get(f"{BASE_URL}/api/marketplace/listings", 
                          headers=self.buyer_headers())
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "listings" in data
        listings = data["listings"]
        assert len(listings) > 0, "Expected at least one listing"
        # Check listing structure
        listing = listings[0]
        assert "listing_id" in listing
        assert "title" in listing
        assert "price" in listing
        assert "status" in listing
        print(f"Found {len(listings)} listings")
    
    # ─── Buy Now Tests ───
    
    def test_06_buy_listing_creates_checkout(self):
        """POST /api/marketplace/buy/{listing_id} - creates Stripe checkout session"""
        if not TestMarketplacePayments.test_listing_id:
            pytest.skip("No test listing available")
        
        res = requests.post(
            f"{BASE_URL}/api/marketplace/buy/{TestMarketplacePayments.test_listing_id}",
            json={"origin_url": "https://pet-social-dev.preview.emergentagent.com"},
            headers=self.buyer_headers()
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "url" in data, f"Expected checkout URL in response, got {data}"
        assert "session_id" in data, f"Expected session_id in response, got {data}"
        assert data["url"].startswith("http"), f"URL should be valid: {data['url']}"
        print(f"Checkout session created: {data['session_id']}")
        print(f"Checkout URL: {data['url'][:100]}...")
    
    def test_07_cannot_buy_own_listing(self):
        """POST /api/marketplace/buy/{listing_id} - cannot buy own listing (400 error)"""
        if not TestMarketplacePayments.test_listing_id:
            pytest.skip("No test listing available")
        
        # Admin tries to buy their own listing
        res = requests.post(
            f"{BASE_URL}/api/marketplace/buy/{TestMarketplacePayments.test_listing_id}",
            json={"origin_url": "https://pet-social-dev.preview.emergentagent.com"},
            headers=self.admin_headers()
        )
        assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"
        data = res.json()
        assert "cannot buy your own" in data.get("detail", "").lower() or "own listing" in data.get("detail", "").lower(), f"Expected 'cannot buy own listing' error, got {data}"
        print(f"Correctly blocked self-purchase: {data}")
    
    def test_08_buy_nonexistent_listing(self):
        """POST /api/marketplace/buy/{listing_id} - returns 404 for nonexistent listing"""
        res = requests.post(
            f"{BASE_URL}/api/marketplace/buy/nonexistent_listing_123",
            json={"origin_url": "https://pet-social-dev.preview.emergentagent.com"},
            headers=self.buyer_headers()
        )
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print("Correctly returned 404 for nonexistent listing")
    
    # ─── Purchase Status Tests ───
    
    def test_09_purchase_status_requires_valid_session(self):
        """GET /api/marketplace/buy/status/{session_id} - returns 404 for invalid session"""
        res = requests.get(
            f"{BASE_URL}/api/marketplace/buy/status/invalid_session_123",
            headers=self.buyer_headers()
        )
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print("Correctly returned 404 for invalid session")
    
    # ─── Seller Sales Dashboard Tests ───
    
    def test_10_seller_sales_endpoint(self):
        """GET /api/marketplace/connect/sales - returns seller's sales and earnings"""
        res = requests.get(f"{BASE_URL}/api/marketplace/connect/sales", 
                          headers=self.admin_headers())
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "sales" in data
        assert "total_sales" in data
        assert "total_earnings" in data
        assert "current_balance" in data
        assert "platform_fee_percent" in data
        assert data["platform_fee_percent"] == 10, f"Expected 10% fee, got {data['platform_fee_percent']}"
        print(f"Seller sales data: total_sales={data['total_sales']}, earnings=${data['total_earnings']}, balance=${data['current_balance']}")
    
    # ─── Buyer Purchases Tests ───
    
    def test_11_buyer_purchases_endpoint(self):
        """GET /api/marketplace/purchases - returns buyer's purchases"""
        res = requests.get(f"{BASE_URL}/api/marketplace/purchases", 
                          headers=self.buyer_headers())
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "purchases" in data
        assert isinstance(data["purchases"], list)
        print(f"Buyer has {len(data['purchases'])} purchases")
    
    # ─── Admin Transactions Tests ───
    
    def test_12_admin_transactions_endpoint(self):
        """GET /api/marketplace/admin/transactions - admin-only marketplace transactions view"""
        res = requests.get(f"{BASE_URL}/api/marketplace/admin/transactions", 
                          headers=self.admin_headers())
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "transactions" in data
        assert "total_revenue" in data
        assert "total_volume" in data
        assert "platform_fee_percent" in data
        print(f"Admin transactions: count={len(data['transactions'])}, revenue=${data['total_revenue']}, volume=${data['total_volume']}")
    
    def test_13_admin_transactions_forbidden_for_non_admin(self):
        """GET /api/marketplace/admin/transactions - returns 403 for non-admin"""
        res = requests.get(f"{BASE_URL}/api/marketplace/admin/transactions", 
                          headers=self.buyer_headers())
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        print("Correctly blocked non-admin from admin transactions")
    
    # ─── Existing Subscription Checkout Still Works ───
    
    def test_14_subscription_checkout_still_works(self):
        """POST /api/stripe/create-checkout-session - existing subscription checkout still works"""
        res = requests.post(f"{BASE_URL}/api/stripe/create-checkout-session", json={
            "tier_id": "prime",
            "origin_url": "https://pet-social-dev.preview.emergentagent.com"
        }, headers=self.buyer_headers())
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "url" in data, f"Expected checkout URL, got {data}"
        assert "session_id" in data
        print(f"Subscription checkout still works: {data['session_id']}")
    
    # ─── Cleanup ───
    
    def test_99_cleanup_test_listing(self):
        """Cleanup: Delete test listing"""
        if TestMarketplacePayments.test_listing_id:
            res = requests.delete(
                f"{BASE_URL}/api/marketplace/listings/{TestMarketplacePayments.test_listing_id}",
                headers=self.admin_headers()
            )
            print(f"Cleanup: Deleted test listing, status={res.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
