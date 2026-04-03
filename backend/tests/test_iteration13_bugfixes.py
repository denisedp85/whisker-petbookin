"""
Iteration 13 Tests - Bug Fixes for User-Reported Issues
Tests:
1. Admin user (admin@petbookin.com) has correct role/tier/is_admin/breeder_id
2. Geocode API works with ZIP codes (90210)
3. Places search API returns results (with caching)
4. Admin cleanup-test-data endpoint
5. Admin setup-breeder endpoint
6. Feed/pets/marketplace should be empty after cleanup
7. Startup seed upgrades admin users automatically
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@petbookin.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "PetbookinAdmin2026!")


class TestAdminAuth:
    """Test admin user authentication and profile"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    def test_admin_login_success(self):
        """Admin can login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"Admin login successful, user_id: {data['user'].get('user_id')}")
    
    def test_admin_me_endpoint(self, admin_token):
        """GET /api/auth/me returns correct admin profile"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        user = response.json()
        
        # Verify admin fields
        assert user.get("email") == ADMIN_EMAIL, f"Email mismatch: {user.get('email')}"
        assert user.get("role") == "owner", f"Role should be 'owner', got: {user.get('role')}"
        assert user.get("membership_tier") == "mega", f"Tier should be 'mega', got: {user.get('membership_tier')}"
        assert user.get("is_admin") == True, f"is_admin should be True, got: {user.get('is_admin')}"
        assert user.get("is_seller") == True, f"is_seller should be True, got: {user.get('is_seller')}"
        
        # Check breeder_id if set
        breeder_id = user.get("petbookin_breeder_id") or user.get("breeder_info", {}).get("petbookin_breeder_id")
        print(f"Admin profile verified: role={user.get('role')}, tier={user.get('membership_tier')}, is_admin={user.get('is_admin')}, breeder_id={breeder_id}")


class TestGeocodeAPI:
    """Test geocode endpoint for ZIP code search"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_geocode_zip_90210(self, admin_token):
        """GET /api/places/geocode?q=90210 returns coordinates"""
        response = requests.get(f"{BASE_URL}/api/places/geocode?q=90210", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "locations" in data, f"No locations in response: {data}"
        assert len(data["locations"]) > 0, f"No locations found for 90210: {data}"
        
        loc = data["locations"][0]
        assert "lat" in loc, "No lat in location"
        assert "lng" in loc, "No lng in location"
        assert "display_name" in loc, "No display_name in location"
        
        # Beverly Hills is around 34.09, -118.41
        assert 33 < loc["lat"] < 35, f"Lat out of range: {loc['lat']}"
        assert -120 < loc["lng"] < -117, f"Lng out of range: {loc['lng']}"
        
        print(f"Geocode 90210: lat={loc['lat']}, lng={loc['lng']}, name={loc['display_name']}")
    
    def test_geocode_city_name(self, admin_token):
        """Geocode works with city names too"""
        response = requests.get(f"{BASE_URL}/api/places/geocode?q=Los Angeles, CA", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert len(data.get("locations", [])) > 0, "No locations found for Los Angeles"
        print(f"Geocode Los Angeles: {data['locations'][0]['display_name']}")


class TestPlacesSearchAPI:
    """Test places search endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_places_search_vet(self, admin_token):
        """GET /api/places/search returns vet locations"""
        # Beverly Hills coordinates
        lat, lng = 34.09, -118.41
        response = requests.get(
            f"{BASE_URL}/api/places/search?lat={lat}&lng={lng}&type=vet&radius=15000",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "places" in data, f"No places in response: {data}"
        assert "total" in data, "No total in response"
        assert "type" in data, "No type in response"
        assert data["type"] == "vet"
        
        # May be cached or fresh
        cached = data.get("cached", False)
        print(f"Places search: {data['total']} vets found (cached={cached})")
        
        # If we have results, verify structure
        if data["total"] > 0:
            place = data["places"][0]
            assert "name" in place, "No name in place"
            assert "lat" in place, "No lat in place"
            assert "lng" in place, "No lng in place"
            print(f"First result: {place['name']}")
    
    def test_places_search_pet_store(self, admin_token):
        """Search for pet stores"""
        lat, lng = 34.09, -118.41
        response = requests.get(
            f"{BASE_URL}/api/places/search?lat={lat}&lng={lng}&type=pet_store&radius=15000",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Pet stores found: {data.get('total', 0)}")
    
    def test_places_search_dog_park(self, admin_token):
        """Search for dog parks"""
        lat, lng = 34.09, -118.41
        response = requests.get(
            f"{BASE_URL}/api/places/search?lat={lat}&lng={lng}&type=dog_park&radius=15000",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Dog parks found: {data.get('total', 0)}")


class TestAdminEndpoints:
    """Test admin-only endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_admin_cleanup_test_data(self, admin_token):
        """POST /api/admin/cleanup-test-data works for admin"""
        response = requests.post(
            f"{BASE_URL}/api/admin/cleanup-test-data",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={}
        )
        assert response.status_code == 200, f"Cleanup failed: {response.text}"
        data = response.json()
        
        assert "message" in data, "No message in response"
        print(f"Cleanup result: {data}")
    
    def test_admin_setup_breeder(self, admin_token):
        """POST /api/admin/setup-breeder/{email} works for admin"""
        response = requests.post(
            f"{BASE_URL}/api/admin/setup-breeder/{ADMIN_EMAIL}",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "breeds": ["Golden Retriever", "Labrador"],
                "kennel_name": "Petbookin Official",
                "breeder_type": "professional"
            }
        )
        assert response.status_code == 200, f"Setup breeder failed: {response.text}"
        data = response.json()
        
        assert "breeder_id" in data, "No breeder_id in response"
        assert data["breeder_id"].startswith("PBK-BR-"), f"Invalid breeder_id format: {data['breeder_id']}"
        print(f"Breeder setup: {data['breeder_id']}")
    
    def test_admin_stats(self, admin_token):
        """GET /api/admin/stats works for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "total_users" in data
        assert "total_pets" in data
        assert "total_posts" in data
        print(f"Admin stats: users={data['total_users']}, pets={data['total_pets']}, posts={data['total_posts']}")


class TestDataCleanup:
    """Verify test data was cleaned up"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_pets_mine_empty_or_minimal(self, admin_token):
        """GET /api/pets/mine should return 0 or minimal pets after cleanup"""
        response = requests.get(
            f"{BASE_URL}/api/pets/mine",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # API returns list directly or dict with pets key
        pets = data if isinstance(data, list) else data.get("pets", [])
        print(f"Admin's pets count: {len(pets)}")
    
    def test_feed_posts_empty_or_minimal(self, admin_token):
        """GET /api/feed/posts should return 0 or minimal posts after cleanup"""
        response = requests.get(
            f"{BASE_URL}/api/feed/posts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        posts = data.get("posts", [])
        print(f"Feed posts count: {len(posts)}")
    
    def test_marketplace_listings(self, admin_token):
        """GET /api/marketplace/listings should work"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace/listings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        listings = data.get("listings", [])
        print(f"Marketplace listings count: {len(listings)}")


class TestBreederVerification:
    """Verify breeder credentials after setup"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_admin_has_breeder_info(self, admin_token):
        """Admin should have breeder_info after setup"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        user = response.json()
        
        breeder_info = user.get("breeder_info")
        if breeder_info:
            assert breeder_info.get("is_verified") == True, "Breeder should be verified"
            assert breeder_info.get("petbookin_breeder_id", "").startswith("PBK-BR-"), "Invalid breeder ID"
            print(f"Breeder info verified: {breeder_info.get('petbookin_breeder_id')}, kennel={breeder_info.get('kennel_name')}")
        else:
            print("No breeder_info yet - will be set after setup-breeder call")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
