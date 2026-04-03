"""
Iteration 5 Feature Tests for Petbookin
Tests:
- Payment History (GET /api/stripe/payment-history)
- A La Carte Packs (POST /api/stripe/purchase-pack, GET /api/stripe/pack-checkout-status)
- Custom Role Management (GET/POST/DELETE /api/admin/custom-roles)
- Post Types with Tier Gating (video=Ultra+, audio=Pro+, text=everyone)
- Assign Role with Custom Roles
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@petbookin.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "PetbookinAdmin2026!")
FREE_USER_EMAIL = "freeuser@test.com"
FREE_USER_PASSWORD = "Test1234!"

# A la carte packs
ALA_CARTE_PACKS = {
    "ai_10": {"name": "10 AI Generations", "amount": 2.99},
    "ai_50": {"name": "50 AI Generations", "amount": 9.99},
    "promo_1": {"name": "Post Promotion (1 Week)", "amount": 4.99},
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
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session


@pytest.fixture(scope="module")
def free_user_token(api_client):
    """Get or create free user token"""
    # Try to login first
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": FREE_USER_EMAIL,
        "password": FREE_USER_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    # Register if login fails
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": FREE_USER_EMAIL,
        "password": FREE_USER_PASSWORD,
        "name": "Free Test User"
    })
    if response.status_code in [200, 201]:
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    pytest.skip(f"Could not create free user: {response.text}")


@pytest.fixture(scope="module")
def free_user_client(free_user_token):
    """Session with free user auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {free_user_token}"
    })
    return session


# ============ PAYMENT HISTORY TESTS ============

class TestPaymentHistory:
    """Test GET /api/stripe/payment-history"""
    
    def test_payment_history_requires_auth(self, api_client):
        """Payment history requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/stripe/payment-history")
        assert response.status_code == 401
        print("✓ Payment history requires auth")
    
    def test_payment_history_returns_transactions(self, admin_client):
        """Payment history returns user's transactions"""
        response = admin_client.get(f"{BASE_URL}/api/stripe/payment-history")
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        assert isinstance(data["transactions"], list)
        print(f"✓ Payment history returned {len(data['transactions'])} transactions")
    
    def test_payment_history_transaction_structure(self, admin_client):
        """Verify transaction structure if any exist"""
        response = admin_client.get(f"{BASE_URL}/api/stripe/payment-history")
        assert response.status_code == 200
        data = response.json()
        if data["transactions"]:
            txn = data["transactions"][0]
            # Check expected fields
            assert "session_id" in txn
            assert "user_id" in txn
            assert "amount" in txn
            assert "payment_status" in txn
            print(f"✓ Transaction structure valid: {txn.get('tier_name') or txn.get('pack_name')}")
        else:
            print("✓ No transactions yet (empty list is valid)")


# ============ A LA CARTE PACK TESTS ============

class TestALaCartePacks:
    """Test POST /api/stripe/purchase-pack and GET /api/stripe/pack-checkout-status"""
    
    def test_purchase_pack_requires_auth(self, api_client):
        """Purchase pack requires authentication"""
        response = api_client.post(f"{BASE_URL}/api/stripe/purchase-pack", json={
            "pack_id": "ai_10",
            "origin_url": "https://example.com"
        })
        assert response.status_code == 401
        print("✓ Purchase pack requires auth")
    
    def test_purchase_pack_invalid_pack(self, admin_client):
        """Invalid pack ID returns 400"""
        response = admin_client.post(f"{BASE_URL}/api/stripe/purchase-pack", json={
            "pack_id": "invalid_pack",
            "origin_url": "https://example.com"
        })
        assert response.status_code == 400
        data = response.json()
        assert "Invalid pack" in data.get("detail", "")
        print("✓ Invalid pack returns 400")
    
    def test_purchase_pack_ai_10(self, admin_client):
        """Purchase ai_10 pack creates checkout session"""
        response = admin_client.post(f"{BASE_URL}/api/stripe/purchase-pack", json={
            "pack_id": "ai_10",
            "origin_url": "https://pet-social-dev.preview.emergentagent.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "session_id" in data
        assert data["url"].startswith("https://checkout.stripe.com")
        print(f"✓ ai_10 pack checkout created: {data['session_id'][:20]}...")
        return data["session_id"]
    
    def test_purchase_pack_ai_50(self, admin_client):
        """Purchase ai_50 pack creates checkout session"""
        response = admin_client.post(f"{BASE_URL}/api/stripe/purchase-pack", json={
            "pack_id": "ai_50",
            "origin_url": "https://pet-social-dev.preview.emergentagent.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert data["url"].startswith("https://checkout.stripe.com")
        print(f"✓ ai_50 pack checkout created")
    
    def test_purchase_pack_promo_1(self, admin_client):
        """Purchase promo_1 pack creates checkout session"""
        response = admin_client.post(f"{BASE_URL}/api/stripe/purchase-pack", json={
            "pack_id": "promo_1",
            "origin_url": "https://pet-social-dev.preview.emergentagent.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert data["url"].startswith("https://checkout.stripe.com")
        print(f"✓ promo_1 pack checkout created")
    
    def test_pack_checkout_status_requires_auth(self, api_client):
        """Pack checkout status requires auth"""
        response = api_client.get(f"{BASE_URL}/api/stripe/pack-checkout-status/fake_session")
        assert response.status_code == 401
        print("✓ Pack checkout status requires auth")


# ============ CUSTOM ROLE MANAGEMENT TESTS ============

class TestCustomRoleManagement:
    """Test custom role CRUD endpoints"""
    
    def test_list_custom_roles_requires_admin(self, free_user_client):
        """List custom roles requires admin"""
        response = free_user_client.get(f"{BASE_URL}/api/admin/custom-roles")
        assert response.status_code == 403
        print("✓ List custom roles requires admin")
    
    def test_list_custom_roles(self, admin_client):
        """Admin can list custom roles"""
        response = admin_client.get(f"{BASE_URL}/api/admin/custom-roles")
        assert response.status_code == 200
        data = response.json()
        assert "roles" in data
        assert isinstance(data["roles"], list)
        print(f"✓ Listed {len(data['roles'])} custom roles")
    
    def test_create_custom_role(self, admin_client):
        """Admin can create custom role"""
        unique_id = f"test_role_{uuid.uuid4().hex[:8]}"
        response = admin_client.post(f"{BASE_URL}/api/admin/custom-roles", json={
            "role_id": unique_id,
            "label": "Test Role",
            "color": "#FF5733",
            "badge_text": "TESTER"
        })
        assert response.status_code == 200
        data = response.json()
        assert "role_id" in data
        assert data["role_id"] == unique_id
        print(f"✓ Created custom role: {unique_id}")
        return unique_id
    
    def test_create_duplicate_role_fails(self, admin_client):
        """Creating duplicate role ID fails"""
        # First create a role
        unique_id = f"dup_role_{uuid.uuid4().hex[:8]}"
        response = admin_client.post(f"{BASE_URL}/api/admin/custom-roles", json={
            "role_id": unique_id,
            "label": "Duplicate Test",
            "color": "#FF5733"
        })
        assert response.status_code == 200
        
        # Try to create same role again
        response = admin_client.post(f"{BASE_URL}/api/admin/custom-roles", json={
            "role_id": unique_id,
            "label": "Duplicate Test 2",
            "color": "#FF5733"
        })
        assert response.status_code == 400
        assert "already exists" in response.json().get("detail", "")
        print("✓ Duplicate role creation blocked")
    
    def test_create_builtin_role_fails(self, admin_client):
        """Cannot create role with built-in name"""
        response = admin_client.post(f"{BASE_URL}/api/admin/custom-roles", json={
            "role_id": "admin",
            "label": "Fake Admin",
            "color": "#FF5733"
        })
        assert response.status_code == 400
        assert "built-in" in response.json().get("detail", "").lower()
        print("✓ Built-in role name blocked")
    
    def test_delete_custom_role(self, admin_client):
        """Admin can delete custom role"""
        # First create a role to delete
        unique_id = f"del_role_{uuid.uuid4().hex[:8]}"
        create_resp = admin_client.post(f"{BASE_URL}/api/admin/custom-roles", json={
            "role_id": unique_id,
            "label": "To Delete",
            "color": "#FF5733"
        })
        assert create_resp.status_code == 200
        
        # Delete it
        response = admin_client.delete(f"{BASE_URL}/api/admin/custom-roles/{unique_id}")
        assert response.status_code == 200
        print(f"✓ Deleted custom role: {unique_id}")
    
    def test_delete_nonexistent_role(self, admin_client):
        """Deleting nonexistent role returns 404"""
        response = admin_client.delete(f"{BASE_URL}/api/admin/custom-roles/nonexistent_role_xyz")
        assert response.status_code == 404
        print("✓ Delete nonexistent role returns 404")


# ============ ASSIGN ROLE WITH CUSTOM ROLES TESTS ============

class TestAssignRoleWithCustomRoles:
    """Test assign-role endpoint with custom roles"""
    
    def test_assign_builtin_role(self, admin_client):
        """Can assign built-in role"""
        # Get a non-admin user
        users_resp = admin_client.get(f"{BASE_URL}/api/admin/users")
        assert users_resp.status_code == 200
        users = users_resp.json().get("users", [])
        non_admin = next((u for u in users if not u.get("is_admin")), None)
        
        if not non_admin:
            pytest.skip("No non-admin users to test with")
        
        response = admin_client.post(f"{BASE_URL}/api/admin/assign-role", json={
            "user_id": non_admin["user_id"],
            "role": "moderator",
            "role_title": "Test Moderator"
        })
        assert response.status_code == 200
        print(f"✓ Assigned moderator role to {non_admin['name']}")
    
    def test_assign_custom_role(self, admin_client):
        """Can assign custom role"""
        # Create a custom role first
        unique_id = f"assign_test_{uuid.uuid4().hex[:8]}"
        admin_client.post(f"{BASE_URL}/api/admin/custom-roles", json={
            "role_id": unique_id,
            "label": "Assign Test Role",
            "color": "#9B59B6",
            "badge_text": "ASSIGN"
        })
        
        # Get a non-admin user
        users_resp = admin_client.get(f"{BASE_URL}/api/admin/users")
        users = users_resp.json().get("users", [])
        non_admin = next((u for u in users if not u.get("is_admin")), None)
        
        if not non_admin:
            pytest.skip("No non-admin users to test with")
        
        response = admin_client.post(f"{BASE_URL}/api/admin/assign-role", json={
            "user_id": non_admin["user_id"],
            "role": unique_id
        })
        assert response.status_code == 200
        print(f"✓ Assigned custom role {unique_id} to {non_admin['name']}")
    
    def test_assign_invalid_role_fails(self, admin_client):
        """Assigning invalid role fails"""
        users_resp = admin_client.get(f"{BASE_URL}/api/admin/users")
        users = users_resp.json().get("users", [])
        non_admin = next((u for u in users if not u.get("is_admin")), None)
        
        if not non_admin:
            pytest.skip("No non-admin users to test with")
        
        response = admin_client.post(f"{BASE_URL}/api/admin/assign-role", json={
            "user_id": non_admin["user_id"],
            "role": "totally_fake_role_xyz"
        })
        assert response.status_code == 400
        print("✓ Invalid role assignment blocked")


# ============ POST TYPE TIER GATING TESTS ============

class TestPostTypeTierGating:
    """Test post creation with tier-gated post types"""
    
    def test_text_post_any_tier(self, free_user_client):
        """Free user can create text posts"""
        response = free_user_client.post(f"{BASE_URL}/api/feed/posts", json={
            "content": "Test text post from free user",
            "post_type": "text"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["post_type"] == "text"
        print("✓ Free user can create text posts")
    
    def test_video_post_requires_ultra(self, free_user_client):
        """Free user cannot create video posts (requires Ultra+)"""
        response = free_user_client.post(f"{BASE_URL}/api/feed/posts", json={
            "content": "Test video post",
            "post_type": "video",
            "media_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        })
        assert response.status_code == 403
        data = response.json()
        assert "Ultra" in data.get("detail", "")
        print("✓ Video posts require Ultra+ tier")
    
    def test_audio_post_requires_pro(self, free_user_client):
        """Free user cannot create audio posts (requires Pro+)"""
        response = free_user_client.post(f"{BASE_URL}/api/feed/posts", json={
            "content": "Test audio post",
            "post_type": "audio",
            "media_url": "https://example.com/audio.mp3"
        })
        assert response.status_code == 403
        data = response.json()
        assert "Pro" in data.get("detail", "")
        print("✓ Audio posts require Pro+ tier")
    
    def test_admin_can_create_video_post(self, admin_client):
        """Admin (mega tier) can create video posts"""
        response = admin_client.post(f"{BASE_URL}/api/feed/posts", json={
            "content": "Test video post from admin",
            "post_type": "video",
            "media_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["post_type"] == "video"
        assert data["media_url"] == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        print("✓ Admin can create video posts")
    
    def test_admin_can_create_audio_post(self, admin_client):
        """Admin (mega tier) can create audio posts"""
        response = admin_client.post(f"{BASE_URL}/api/feed/posts", json={
            "content": "Test audio post from admin",
            "post_type": "audio",
            "media_url": "https://example.com/song.mp3"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["post_type"] == "audio"
        assert data["media_url"] == "https://example.com/song.mp3"
        print("✓ Admin can create audio posts")
    
    def test_video_post_requires_media_url(self, admin_client):
        """Video post requires media_url"""
        response = admin_client.post(f"{BASE_URL}/api/feed/posts", json={
            "content": "Video without URL",
            "post_type": "video"
        })
        assert response.status_code == 400
        assert "Media URL required" in response.json().get("detail", "")
        print("✓ Video posts require media_url")
    
    def test_audio_post_requires_media_url(self, admin_client):
        """Audio post requires media_url"""
        response = admin_client.post(f"{BASE_URL}/api/feed/posts", json={
            "content": "Audio without URL",
            "post_type": "audio"
        })
        assert response.status_code == 400
        assert "Media URL required" in response.json().get("detail", "")
        print("✓ Audio posts require media_url")


# ============ FEED POSTS WITH POST TYPE TESTS ============

class TestFeedPostsWithPostType:
    """Test GET /api/feed/posts returns post_type and media_url"""
    
    def test_feed_posts_include_post_type(self, admin_client):
        """Feed posts include post_type field"""
        response = admin_client.get(f"{BASE_URL}/api/feed/posts")
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        
        if data["posts"]:
            post = data["posts"][0]
            assert "post_type" in post
            print(f"✓ Posts include post_type: {post['post_type']}")
        else:
            print("✓ No posts yet (empty list is valid)")
    
    def test_video_post_has_media_url(self, admin_client):
        """Video posts have media_url in response"""
        # Create a video post first
        create_resp = admin_client.post(f"{BASE_URL}/api/feed/posts", json={
            "content": "Video for feed test",
            "post_type": "video",
            "media_url": "https://www.youtube.com/watch?v=test123"
        })
        assert create_resp.status_code == 200
        
        # Fetch feed and find video posts
        response = admin_client.get(f"{BASE_URL}/api/feed/posts")
        data = response.json()
        video_posts = [p for p in data["posts"] if p.get("post_type") == "video"]
        
        if video_posts:
            assert "media_url" in video_posts[0]
            assert video_posts[0]["media_url"]
            print(f"✓ Video posts have media_url: {video_posts[0]['media_url'][:30]}...")
        else:
            print("✓ No video posts found (test post may have been cleaned)")


# ============ CLEANUP ============

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_roles(self, admin_client):
        """Clean up test roles"""
        response = admin_client.get(f"{BASE_URL}/api/admin/custom-roles")
        if response.status_code == 200:
            roles = response.json().get("roles", [])
            test_roles = [r for r in roles if r["role_id"].startswith(("test_role_", "dup_role_", "del_role_", "assign_test_"))]
            for role in test_roles:
                admin_client.delete(f"{BASE_URL}/api/admin/custom-roles/{role['role_id']}")
            print(f"✓ Cleaned up {len(test_roles)} test roles")
        else:
            print("✓ No cleanup needed")
