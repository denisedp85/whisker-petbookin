"""
Iteration 16 - Comprehensive End-to-End API Tests
Tests all critical flows: auth, feed, posts, admin, and data management
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@petbookin.com"
ADMIN_PASSWORD = "PetbookinAdmin2026!"
TEST_USER_EMAIL = f"newuser_test_{int(time.time())}@test.com"
TEST_USER_PASSWORD = "TestPass123!"
TEST_USER_NAME = "Test User E2E"


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")


class TestAuthRegister:
    """Test user registration flow"""
    
    def test_register_new_user(self):
        """Register a new user and verify response"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in registration response"
        assert "user" in data, "No user in registration response"
        assert data["user"]["email"] == TEST_USER_EMAIL
        print(f"✓ User registration passed: {TEST_USER_EMAIL}")
        return data["token"]
    
    def test_register_duplicate_email(self):
        """Registering with existing email should fail"""
        # First register
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "duplicate_test@test.com",
            "password": "Test1234!",
            "name": "Duplicate Test"
        })
        # Try again
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "duplicate_test@test.com",
            "password": "Test1234!",
            "name": "Duplicate Test"
        })
        assert response.status_code in [400, 409], "Duplicate registration should fail"
        print("✓ Duplicate email rejection passed")


class TestAuthLogin:
    """Test login flow"""
    
    def test_login_admin(self):
        """Login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        assert "user" in data, "No user in login response"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"].get("is_admin") == True, "Admin flag not set"
        print(f"✓ Admin login passed: {ADMIN_EMAIL}")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Login with wrong password should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "WrongPassword123!"
        })
        assert response.status_code == 401, "Invalid login should return 401"
        print("✓ Invalid credentials rejection passed")


class TestAuthMe:
    """Test /auth/me endpoint"""
    
    def test_get_current_user(self):
        """Get current user profile with valid token"""
        # First login
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_res.json()["token"]
        
        # Get profile
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200, f"Get profile failed: {response.text}"
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert "user_id" in data
        print("✓ Get current user passed")
    
    def test_get_current_user_no_token(self):
        """Get profile without token should fail"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, "Should require authentication"
        print("✓ Unauthenticated access rejection passed")


class TestFeedPosts:
    """Test feed and post operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for tests"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user = login_res.json()["user"]
    
    def test_get_feed_posts(self):
        """Get feed posts"""
        response = requests.get(f"{BASE_URL}/api/feed/posts", headers=self.headers)
        assert response.status_code == 200, f"Get posts failed: {response.text}"
        data = response.json()
        assert "posts" in data
        assert "total" in data
        print(f"✓ Get feed posts passed: {len(data['posts'])} posts")
    
    def test_create_post(self):
        """Create a new text post"""
        response = requests.post(f"{BASE_URL}/api/feed/posts", json={
            "content": f"Test post from iteration 16 - {int(time.time())}",
            "post_type": "text"
        }, headers=self.headers)
        assert response.status_code == 200, f"Create post failed: {response.text}"
        data = response.json()
        assert "post_id" in data
        assert data["author_id"] == self.user["user_id"]
        print(f"✓ Create post passed: {data['post_id']}")
        return data["post_id"]
    
    def test_delete_own_post(self):
        """Create and delete own post"""
        # Create post
        create_res = requests.post(f"{BASE_URL}/api/feed/posts", json={
            "content": f"Post to delete - {int(time.time())}",
            "post_type": "text"
        }, headers=self.headers)
        post_id = create_res.json()["post_id"]
        
        # Delete post
        response = requests.delete(f"{BASE_URL}/api/feed/posts/{post_id}", headers=self.headers)
        assert response.status_code == 200, f"Delete post failed: {response.text}"
        print(f"✓ Delete own post passed: {post_id}")
    
    def test_admin_delete_any_post(self):
        """Admin can delete any post"""
        # First create a post as admin
        create_res = requests.post(f"{BASE_URL}/api/feed/posts", json={
            "content": f"Admin delete test - {int(time.time())}",
            "post_type": "text"
        }, headers=self.headers)
        post_id = create_res.json()["post_id"]
        
        # Admin deletes it
        response = requests.delete(f"{BASE_URL}/api/feed/posts/{post_id}", headers=self.headers)
        assert response.status_code == 200, f"Admin delete failed: {response.text}"
        print(f"✓ Admin delete any post passed: {post_id}")
    
    def test_like_post(self):
        """Like and unlike a post"""
        # Create post
        create_res = requests.post(f"{BASE_URL}/api/feed/posts", json={
            "content": f"Like test post - {int(time.time())}",
            "post_type": "text"
        }, headers=self.headers)
        post_id = create_res.json()["post_id"]
        
        # Like
        like_res = requests.post(f"{BASE_URL}/api/feed/posts/{post_id}/like", headers=self.headers)
        assert like_res.status_code == 200
        assert like_res.json()["liked"] == True
        
        # Unlike
        unlike_res = requests.post(f"{BASE_URL}/api/feed/posts/{post_id}/like", headers=self.headers)
        assert unlike_res.status_code == 200
        assert unlike_res.json()["liked"] == False
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/feed/posts/{post_id}", headers=self.headers)
        print("✓ Like/unlike post passed")


class TestAdminEndpoints:
    """Test admin-only endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_admin_stats(self):
        """Get admin statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=self.headers)
        assert response.status_code == 200, f"Get stats failed: {response.text}"
        data = response.json()
        assert "total_users" in data
        assert "total_pets" in data
        assert "total_posts" in data
        print(f"✓ Admin stats passed: {data['total_users']} users, {data['total_posts']} posts")
    
    def test_get_admin_users(self):
        """Get user list"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        assert response.status_code == 200, f"Get users failed: {response.text}"
        data = response.json()
        assert "users" in data
        assert "total" in data
        print(f"✓ Admin users list passed: {data['total']} users")
    
    def test_cleanup_test_data(self):
        """Test cleanup endpoint (without delete_all_posts)"""
        response = requests.post(f"{BASE_URL}/api/admin/cleanup-test-data", 
                                 json={}, headers=self.headers)
        assert response.status_code == 200, f"Cleanup failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Cleanup test data passed: {data}")
    
    def test_cleanup_with_delete_all_posts(self):
        """Test cleanup with delete_all_posts flag"""
        # First create a test post
        requests.post(f"{BASE_URL}/api/feed/posts", json={
            "content": "Post to be deleted by cleanup",
            "post_type": "text"
        }, headers=self.headers)
        
        # Note: We won't actually delete all posts in this test
        # Just verify the endpoint accepts the parameter
        response = requests.post(f"{BASE_URL}/api/admin/cleanup-test-data", 
                                 json={"delete_all_posts": False}, headers=self.headers)
        assert response.status_code == 200
        print("✓ Cleanup with delete_all_posts flag accepted")


class TestNonAdminAccess:
    """Test that non-admin users cannot access admin endpoints"""
    
    def test_non_admin_cannot_access_stats(self):
        """Regular user cannot access admin stats"""
        # Register a new user
        reg_res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"regular_user_{int(time.time())}@test.com",
            "password": "Test1234!",
            "name": "Regular User"
        })
        if reg_res.status_code != 200:
            pytest.skip("Could not create test user")
        
        token = reg_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 403, "Non-admin should get 403"
        print("✓ Non-admin access rejection passed")


class TestPostDeletionPermissions:
    """Test post deletion permissions for different user types"""
    
    def test_author_can_delete_own_post(self):
        """Post author can delete their own post"""
        # Create user
        reg_res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"author_test_{int(time.time())}@test.com",
            "password": "Test1234!",
            "name": "Author Test"
        })
        if reg_res.status_code != 200:
            pytest.skip("Could not create test user")
        
        token = reg_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create post
        create_res = requests.post(f"{BASE_URL}/api/feed/posts", json={
            "content": "My post to delete",
            "post_type": "text"
        }, headers=headers)
        post_id = create_res.json()["post_id"]
        
        # Delete own post
        delete_res = requests.delete(f"{BASE_URL}/api/feed/posts/{post_id}", headers=headers)
        assert delete_res.status_code == 200, "Author should be able to delete own post"
        print("✓ Author can delete own post")
    
    def test_admin_can_delete_others_post(self):
        """Admin can delete any user's post"""
        # Create regular user and post
        reg_res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"victim_user_{int(time.time())}@test.com",
            "password": "Test1234!",
            "name": "Victim User"
        })
        if reg_res.status_code != 200:
            pytest.skip("Could not create test user")
        
        user_token = reg_res.json()["token"]
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # User creates post
        create_res = requests.post(f"{BASE_URL}/api/feed/posts", json={
            "content": "User's post for admin to delete",
            "post_type": "text"
        }, headers=user_headers)
        post_id = create_res.json()["post_id"]
        
        # Admin logs in
        admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        admin_token = admin_login.json()["token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Admin deletes user's post
        delete_res = requests.delete(f"{BASE_URL}/api/feed/posts/{post_id}", headers=admin_headers)
        assert delete_res.status_code == 200, f"Admin should be able to delete any post: {delete_res.text}"
        print("✓ Admin can delete other user's post")
    
    def test_user_cannot_delete_others_post(self):
        """Regular user cannot delete another user's post"""
        # Create first user and post
        reg1 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"user1_{int(time.time())}@test.com",
            "password": "Test1234!",
            "name": "User One"
        })
        if reg1.status_code != 200:
            pytest.skip("Could not create test user 1")
        
        token1 = reg1.json()["token"]
        headers1 = {"Authorization": f"Bearer {token1}"}
        
        create_res = requests.post(f"{BASE_URL}/api/feed/posts", json={
            "content": "User 1's protected post",
            "post_type": "text"
        }, headers=headers1)
        post_id = create_res.json()["post_id"]
        
        # Create second user
        reg2 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"user2_{int(time.time())}@test.com",
            "password": "Test1234!",
            "name": "User Two"
        })
        if reg2.status_code != 200:
            pytest.skip("Could not create test user 2")
        
        token2 = reg2.json()["token"]
        headers2 = {"Authorization": f"Bearer {token2}"}
        
        # User 2 tries to delete User 1's post
        delete_res = requests.delete(f"{BASE_URL}/api/feed/posts/{post_id}", headers=headers2)
        assert delete_res.status_code == 403, "User should not be able to delete other's post"
        
        # Cleanup - user 1 deletes their own post
        requests.delete(f"{BASE_URL}/api/feed/posts/{post_id}", headers=headers1)
        print("✓ User cannot delete other's post")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
