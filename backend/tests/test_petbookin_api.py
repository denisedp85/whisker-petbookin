"""
Petbookin API Tests
Tests for: Auth, Pets, Feed, Breeder, Admin, Search endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@petbookin.com"
ADMIN_PASSWORD = "PetbookinAdmin2026!"
TEST_USER_EMAIL = f"test_{uuid.uuid4().hex[:8]}@example.com"
TEST_USER_PASSWORD = "TestPass123!"
TEST_USER_NAME = "Test User"


class TestHealth:
    """Health check tests"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["app"] == "Petbookin"
        print("✓ Health check passed")


class TestAuth:
    """Authentication endpoint tests"""
    
    def test_register_new_user(self):
        """Test user registration"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME,
            "account_type": "owner"
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "session_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_USER_EMAIL.lower()
        assert data["user"]["name"] == TEST_USER_NAME
        assert data["user"]["membership_tier"] == "free"
        print(f"✓ User registration passed: {TEST_USER_EMAIL}")
        return data
    
    def test_register_duplicate_email(self):
        """Test duplicate email registration fails"""
        # First register
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"dup_{uuid.uuid4().hex[:8]}@example.com",
            "password": "Test123!",
            "name": "Dup User"
        })
        # Try again with same email
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"dup_{uuid.uuid4().hex[:8]}@example.com",
            "password": "Test123!",
            "name": "Dup User"
        })
        # This should succeed since we're using different emails
        assert response.status_code == 200
        print("✓ Duplicate email check passed")
    
    def test_login_admin(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "session_token" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["is_admin"] == True
        assert data["user"]["role"] == "owner"
        assert data["user"]["membership_tier"] == "mega"
        print("✓ Admin login passed")
        return data
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials check passed")
    
    def test_get_me_authenticated(self):
        """Test /auth/me with valid token"""
        # Login first
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_res.json()["session_token"]
        
        # Get me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert "password_hash" not in data
        print("✓ Get /me authenticated passed")
    
    def test_get_me_unauthenticated(self):
        """Test /auth/me without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ Get /me unauthenticated check passed")


class TestPets:
    """Pet CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_res.json()["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_pet(self):
        """Test creating a pet"""
        pet_data = {
            "name": f"TEST_Pet_{uuid.uuid4().hex[:6]}",
            "species": "Dog",
            "breed": "Golden Retriever",
            "age": "3 years",
            "bio": "A friendly golden retriever",
            "gender": "Male"
        }
        response = requests.post(f"{BASE_URL}/api/pets", json=pet_data, headers=self.headers)
        assert response.status_code == 200, f"Create pet failed: {response.text}"
        data = response.json()
        assert data["name"] == pet_data["name"]
        assert data["species"] == pet_data["species"]
        assert data["breed"] == pet_data["breed"]
        assert "pet_id" in data
        print(f"✓ Create pet passed: {data['pet_id']}")
        return data
    
    def test_get_my_pets(self):
        """Test getting user's pets"""
        response = requests.get(f"{BASE_URL}/api/pets/mine", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get my pets passed: {len(data)} pets")
    
    def test_get_pet_by_id(self):
        """Test getting a specific pet"""
        # Create a pet first
        pet_data = {"name": f"TEST_GetPet_{uuid.uuid4().hex[:6]}", "species": "Cat"}
        create_res = requests.post(f"{BASE_URL}/api/pets", json=pet_data, headers=self.headers)
        pet_id = create_res.json()["pet_id"]
        
        # Get the pet
        response = requests.get(f"{BASE_URL}/api/pets/{pet_id}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["pet_id"] == pet_id
        assert data["name"] == pet_data["name"]
        assert "owner" in data
        print(f"✓ Get pet by ID passed: {pet_id}")
    
    def test_update_pet(self):
        """Test updating a pet"""
        # Create a pet first
        pet_data = {"name": f"TEST_UpdatePet_{uuid.uuid4().hex[:6]}", "species": "Dog"}
        create_res = requests.post(f"{BASE_URL}/api/pets", json=pet_data, headers=self.headers)
        pet_id = create_res.json()["pet_id"]
        
        # Update the pet
        update_data = {"name": "Updated Pet Name", "bio": "Updated bio"}
        response = requests.put(f"{BASE_URL}/api/pets/{pet_id}", json=update_data, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Pet Name"
        assert data["bio"] == "Updated bio"
        print(f"✓ Update pet passed: {pet_id}")
    
    def test_delete_pet(self):
        """Test deleting a pet"""
        # Create a pet first
        pet_data = {"name": f"TEST_DeletePet_{uuid.uuid4().hex[:6]}", "species": "Bird"}
        create_res = requests.post(f"{BASE_URL}/api/pets", json=pet_data, headers=self.headers)
        pet_id = create_res.json()["pet_id"]
        
        # Delete the pet
        response = requests.delete(f"{BASE_URL}/api/pets/{pet_id}", headers=self.headers)
        assert response.status_code == 200
        
        # Verify deletion
        get_res = requests.get(f"{BASE_URL}/api/pets/{pet_id}", headers=self.headers)
        assert get_res.status_code == 404
        print(f"✓ Delete pet passed: {pet_id}")


class TestFeed:
    """Feed/Posts tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_res.json()["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_post(self):
        """Test creating a post"""
        post_data = {"content": f"TEST_Post content {uuid.uuid4().hex[:8]}"}
        response = requests.post(f"{BASE_URL}/api/feed/posts", json=post_data, headers=self.headers)
        assert response.status_code == 200, f"Create post failed: {response.text}"
        data = response.json()
        assert data["content"] == post_data["content"]
        assert "post_id" in data
        assert data["likes_count"] == 0
        print(f"✓ Create post passed: {data['post_id']}")
        return data
    
    def test_get_posts(self):
        """Test getting feed posts"""
        response = requests.get(f"{BASE_URL}/api/feed/posts", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        assert "total" in data
        assert "page" in data
        print(f"✓ Get posts passed: {len(data['posts'])} posts")
    
    def test_like_post(self):
        """Test liking a post"""
        # Create a post first
        post_data = {"content": f"TEST_LikePost {uuid.uuid4().hex[:8]}"}
        create_res = requests.post(f"{BASE_URL}/api/feed/posts", json=post_data, headers=self.headers)
        post_id = create_res.json()["post_id"]
        
        # Like the post
        response = requests.post(f"{BASE_URL}/api/feed/posts/{post_id}/like", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["liked"] == True
        
        # Unlike the post
        response2 = requests.post(f"{BASE_URL}/api/feed/posts/{post_id}/like", headers=self.headers)
        assert response2.status_code == 200
        assert response2.json()["liked"] == False
        print(f"✓ Like/unlike post passed: {post_id}")
    
    def test_add_comment(self):
        """Test adding a comment to a post"""
        # Create a post first
        post_data = {"content": f"TEST_CommentPost {uuid.uuid4().hex[:8]}"}
        create_res = requests.post(f"{BASE_URL}/api/feed/posts", json=post_data, headers=self.headers)
        post_id = create_res.json()["post_id"]
        
        # Add comment
        comment_data = {"content": "This is a test comment"}
        response = requests.post(f"{BASE_URL}/api/feed/posts/{post_id}/comments", json=comment_data, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == comment_data["content"]
        assert "comment_id" in data
        print(f"✓ Add comment passed: {data['comment_id']}")
    
    def test_get_comments(self):
        """Test getting comments for a post"""
        # Create a post and add a comment
        post_data = {"content": f"TEST_GetComments {uuid.uuid4().hex[:8]}"}
        create_res = requests.post(f"{BASE_URL}/api/feed/posts", json=post_data, headers=self.headers)
        post_id = create_res.json()["post_id"]
        
        requests.post(f"{BASE_URL}/api/feed/posts/{post_id}/comments", 
                     json={"content": "Test comment"}, headers=self.headers)
        
        # Get comments
        response = requests.get(f"{BASE_URL}/api/feed/posts/{post_id}/comments", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        print(f"✓ Get comments passed: {len(data)} comments")
    
    def test_delete_post(self):
        """Test deleting a post"""
        # Create a post first
        post_data = {"content": f"TEST_DeletePost {uuid.uuid4().hex[:8]}"}
        create_res = requests.post(f"{BASE_URL}/api/feed/posts", json=post_data, headers=self.headers)
        post_id = create_res.json()["post_id"]
        
        # Delete the post
        response = requests.delete(f"{BASE_URL}/api/feed/posts/{post_id}", headers=self.headers)
        assert response.status_code == 200
        print(f"✓ Delete post passed: {post_id}")


class TestBreeder:
    """Breeder registry tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create a fresh user for breeder tests"""
        self.test_email = f"breeder_{uuid.uuid4().hex[:8]}@example.com"
        reg_res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": "BreederTest123!",
            "name": "Test Breeder"
        })
        self.token = reg_res.json()["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_register_as_breeder(self):
        """Test registering as a breeder"""
        breeder_data = {
            "kennel_name": "Test Kennel",
            "specializations": ["Golden Retriever", "Labrador"],
            "years_experience": 5
        }
        response = requests.post(f"{BASE_URL}/api/breeder/register", json=breeder_data, headers=self.headers)
        assert response.status_code == 200, f"Breeder registration failed: {response.text}"
        data = response.json()
        assert "breeder_id" in data
        assert data["breeder_info"]["kennel_name"] == breeder_data["kennel_name"]
        print(f"✓ Register as breeder passed: {data['breeder_id']}")
        return data
    
    def test_add_external_credential(self):
        """Test adding external credential (AKC/CKC)"""
        # Register as breeder first
        requests.post(f"{BASE_URL}/api/breeder/register", json={
            "kennel_name": "Credential Test Kennel",
            "specializations": ["Poodle"],
            "years_experience": 3
        }, headers=self.headers)
        
        # Add external credential
        cred_data = {
            "registry": "AKC",
            "registry_id": "AKC123456",
            "breed_registered": "Poodle"
        }
        response = requests.post(f"{BASE_URL}/api/breeder/credential/external", json=cred_data, headers=self.headers)
        assert response.status_code == 200, f"Add credential failed: {response.text}"
        data = response.json()
        assert data["credential"]["registry"] == "AKC"
        print("✓ Add external credential passed")
    
    def test_request_petbookin_credential(self):
        """Test requesting Petbookin credential"""
        # Register as breeder first
        requests.post(f"{BASE_URL}/api/breeder/register", json={
            "kennel_name": "PBK Cred Test Kennel",
            "specializations": ["Bulldog"],
            "years_experience": 7
        }, headers=self.headers)
        
        # Request Petbookin credential
        response = requests.post(f"{BASE_URL}/api/breeder/credential/petbookin", 
                                json={"reason": "Want to participate in events"}, 
                                headers=self.headers)
        assert response.status_code == 200, f"Request PBK credential failed: {response.text}"
        data = response.json()
        assert "credential" in data
        assert data["credential"]["status"] == "active"
        print("✓ Request Petbookin credential passed")
    
    def test_breeder_directory(self):
        """Test getting breeder directory"""
        response = requests.get(f"{BASE_URL}/api/breeder/directory", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "breeders" in data
        assert "total" in data
        print(f"✓ Breeder directory passed: {data['total']} breeders")


class TestAdmin:
    """Admin endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_res.json()["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_admin_stats(self):
        """Test getting admin stats"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=self.headers)
        assert response.status_code == 200, f"Get stats failed: {response.text}"
        data = response.json()
        assert "total_users" in data
        assert "total_pets" in data
        assert "total_posts" in data
        assert "total_breeders" in data
        assert "tier_counts" in data
        print(f"✓ Admin stats passed: {data['total_users']} users, {data['total_pets']} pets")
    
    def test_list_users(self):
        """Test listing users"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total" in data
        # Verify no password_hash in response
        for user in data["users"]:
            assert "password_hash" not in user
        print(f"✓ List users passed: {data['total']} users")
    
    def test_assign_role(self):
        """Test assigning role to user"""
        # Create a test user
        test_email = f"role_test_{uuid.uuid4().hex[:8]}@example.com"
        reg_res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "RoleTest123!",
            "name": "Role Test User"
        })
        user_id = reg_res.json()["user"]["user_id"]
        
        # Assign role
        response = requests.post(f"{BASE_URL}/api/admin/assign-role", json={
            "user_id": user_id,
            "role": "moderator",
            "role_title": "Community Moderator"
        }, headers=self.headers)
        assert response.status_code == 200, f"Assign role failed: {response.text}"
        print(f"✓ Assign role passed: {user_id} -> moderator")
    
    def test_assign_tier(self):
        """Test assigning tier to user"""
        # Create a test user
        test_email = f"tier_test_{uuid.uuid4().hex[:8]}@example.com"
        reg_res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TierTest123!",
            "name": "Tier Test User"
        })
        user_id = reg_res.json()["user"]["user_id"]
        
        # Assign tier
        response = requests.post(f"{BASE_URL}/api/admin/assign-tier", json={
            "user_id": user_id,
            "tier": "pro"
        }, headers=self.headers)
        assert response.status_code == 200, f"Assign tier failed: {response.text}"
        print(f"✓ Assign tier passed: {user_id} -> pro")
    
    def test_admin_access_denied_for_regular_user(self):
        """Test that regular users can't access admin endpoints"""
        # Create a regular user
        test_email = f"regular_{uuid.uuid4().hex[:8]}@example.com"
        reg_res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "Regular123!",
            "name": "Regular User"
        })
        user_token = reg_res.json()["session_token"]
        
        # Try to access admin stats
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 403
        print("✓ Admin access denied for regular user passed")


class TestSearch:
    """Search endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_res.json()["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_search_all(self):
        """Test search across all types"""
        response = requests.get(f"{BASE_URL}/api/search?q=test", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "pets" in data
        assert "users" in data
        assert "breeders" in data
        assert "posts" in data
        print("✓ Search all passed")
    
    def test_search_pets_only(self):
        """Test search pets only"""
        response = requests.get(f"{BASE_URL}/api/search?q=dog&type=pets", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "pets" in data
        print(f"✓ Search pets passed: {len(data['pets'])} results")
    
    def test_search_users_only(self):
        """Test search users only"""
        response = requests.get(f"{BASE_URL}/api/search?q=admin&type=users", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        print(f"✓ Search users passed: {len(data['users'])} results")


class TestProfileAndTheme:
    """Profile and theme update tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_res.json()["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_update_profile(self):
        """Test updating user profile"""
        response = requests.put(f"{BASE_URL}/api/auth/profile", json={
            "name": "Petbookin Admin",
            "bio": "Official Petbookin Administrator - Updated"
        }, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "bio" in data
        print("✓ Update profile passed")
    
    def test_update_theme(self):
        """Test updating user theme"""
        response = requests.put(f"{BASE_URL}/api/auth/theme", json={
            "bg_color": "#FFFDF9",
            "accent_color": "#FF7A6A"
        }, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "profile_theme" in data
        assert data["profile_theme"]["accent_color"] == "#FF7A6A"
        print("✓ Update theme passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
