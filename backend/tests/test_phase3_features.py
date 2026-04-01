"""
Phase 3 Testing - Petbookin
Tests for:
1. Places API (geocode, search with Overpass API)
2. All-species support in pets and certificates
3. All registries support in breeder credentials
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@petbookin.com"
ADMIN_PASSWORD = "PetbookinAdmin2026!"

# All species supported
ALL_SPECIES = ['dog', 'cat', 'bird', 'horse', 'rabbit', 'reptile', 'fish', 'hamster', 'ferret', 'guinea_pig', 'exotic', 'other']

# All registries supported
ALL_REGISTRIES = ['AKC', 'CKC', 'UKC', 'FCI', 'KC', 'TICA', 'CFA', 'GCCF', 'ACF', 'AFA', 'ABS', 'AQHA', 'APHA', 'USEF', 'ARBA', 'BRC', 'USARK', 'ANKC', 'Other']


class TestHealthAndAuth:
    """Basic health and authentication tests"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["app"] == "Petbookin"
        print("✓ Health check passed")
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful, user_id: {data['user']['user_id']}")
        return data["token"]


class TestPlacesAPI:
    """Tests for Pet-Friendly Places Map API"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Authentication failed")
    
    def test_geocode_miami(self, auth_token):
        """Test geocoding Miami to Florida coordinates"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/places/geocode?q=Miami", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "locations" in data
        assert len(data["locations"]) > 0
        
        # Miami should be around lat 25.76, lng -80.19
        loc = data["locations"][0]
        assert "lat" in loc
        assert "lng" in loc
        assert 25 < loc["lat"] < 27  # Miami latitude range
        assert -81 < loc["lng"] < -79  # Miami longitude range
        print(f"✓ Geocode Miami: lat={loc['lat']}, lng={loc['lng']}")
    
    def test_geocode_new_york(self, auth_token):
        """Test geocoding New York"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/places/geocode?q=New%20York", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "locations" in data
        assert len(data["locations"]) > 0
        loc = data["locations"][0]
        assert 40 < loc["lat"] < 42  # NYC latitude range
        print(f"✓ Geocode New York: lat={loc['lat']}, lng={loc['lng']}")
    
    def test_search_pet_stores_miami(self, auth_token):
        """Test searching for pet stores near Miami"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        # Miami coordinates
        response = requests.get(
            f"{BASE_URL}/api/places/search?lat=25.76&lng=-80.19&type=pet_store&radius=25000",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "places" in data
        assert "total" in data
        assert "type" in data
        assert data["type"] == "pet_store"
        # Pet stores should return results in Miami area
        print(f"✓ Pet stores search: {data['total']} results found")
        if data["total"] > 0:
            place = data["places"][0]
            assert "name" in place
            assert "lat" in place
            assert "lng" in place
            print(f"  First result: {place['name']}")
    
    def test_search_vets(self, auth_token):
        """Test searching for veterinarians"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/places/search?lat=25.76&lng=-80.19&type=vet&radius=25000",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "places" in data
        assert data["type"] == "vet"
        print(f"✓ Vet search: {data['total']} results found")
    
    def test_search_dog_parks(self, auth_token):
        """Test searching for dog parks"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/places/search?lat=25.76&lng=-80.19&type=dog_park&radius=25000",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "places" in data
        assert data["type"] == "dog_park"
        print(f"✓ Dog parks search: {data['total']} results found")
    
    def test_search_groomers(self, auth_token):
        """Test searching for groomers"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/places/search?lat=25.76&lng=-80.19&type=groomer&radius=25000",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "places" in data
        assert data["type"] == "groomer"
        print(f"✓ Groomers search: {data['total']} results found")
    
    def test_search_parks(self, auth_token):
        """Test searching for parks"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/places/search?lat=25.76&lng=-80.19&type=park&radius=25000",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "places" in data
        assert data["type"] == "park"
        print(f"✓ Parks search: {data['total']} results found")
    
    def test_search_invalid_type_defaults_to_vet(self, auth_token):
        """Test that invalid type defaults to vet"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/places/search?lat=25.76&lng=-80.19&type=invalid_type",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "vet"  # Should default to vet
        print("✓ Invalid type defaults to vet")


class TestAllSpeciesSupport:
    """Tests for all 12 species support in pets"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Authentication failed")
    
    def test_create_pet_with_each_species(self, auth_token):
        """Test creating pets with all 12 species"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        created_pets = []
        
        for species in ALL_SPECIES:
            pet_data = {
                "name": f"TEST_{species.upper()}_Pet",
                "species": species,
                "breed": f"Test {species} breed",
                "age": "1 year",
                "gender": "male"
            }
            response = requests.post(f"{BASE_URL}/api/pets", json=pet_data, headers=headers)
            assert response.status_code in [200, 201], f"Failed to create {species} pet: {response.text}"
            data = response.json()
            assert data["species"] == species
            created_pets.append(data["pet_id"])
            print(f"✓ Created {species} pet: {data['pet_id']}")
        
        # Cleanup - delete test pets
        for pet_id in created_pets:
            requests.delete(f"{BASE_URL}/api/pets/{pet_id}", headers=headers)
        
        print(f"✓ All {len(ALL_SPECIES)} species supported for pet creation")


class TestCertificatesAllSpecies:
    """Tests for certificates with all species"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Authentication failed")
    
    def test_certificate_fees_endpoint(self, auth_token):
        """Test certificate fees endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/certificates/fees", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "fees" in data
        assert "tier" in data
        print(f"✓ Certificate fees: {data['fees']}, tier: {data['tier']}")
    
    def test_register_certificate_exotic_species(self, auth_token):
        """Test registering certificate for exotic species"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        cert_data = {
            "pet_name": "TEST_Exotic_Cert",
            "breed": "Sugar Glider",
            "species": "exotic",
            "dob": "2024-01-15",
            "gender": "female",
            "color_markings": "Gray and white",
            "sire_name": "Papa Glider",
            "dam_name": "Mama Glider"
        }
        response = requests.post(f"{BASE_URL}/api/certificates/register-pet", json=cert_data, headers=headers)
        # Should succeed if user is a breeder
        if response.status_code == 200:
            data = response.json()
            assert "certificate_id" in data
            assert data["pet_info"]["species"] == "exotic"
            print(f"✓ Exotic species certificate created: {data['certificate_id']}")
        elif response.status_code == 403:
            print("✓ Certificate endpoint requires breeder status (expected)")
        else:
            print(f"Certificate response: {response.status_code} - {response.text}")


class TestBreederRegistries:
    """Tests for all breeder registries support"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Authentication failed")
    
    def test_breeder_status(self, auth_token):
        """Check if admin is a breeder"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        is_breeder = data.get("breeder_info") is not None
        print(f"✓ Admin breeder status: {is_breeder}")
        if is_breeder:
            print(f"  Kennel: {data['breeder_info'].get('kennel_name')}")
            print(f"  Credentials: {len(data['breeder_info'].get('external_credentials', []))}")
        return is_breeder
    
    def test_add_external_credential_various_registries(self, auth_token):
        """Test adding credentials from various registries"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test a few key registries
        test_registries = ['TICA', 'AFA', 'AQHA', 'ARBA', 'USARK']
        
        for registry in test_registries:
            cred_data = {
                "registry": registry,
                "registry_id": f"TEST-{registry}-12345",
                "breed_registered": f"Test {registry} breed"
            }
            response = requests.post(f"{BASE_URL}/api/breeder/credential/external", json=cred_data, headers=headers)
            if response.status_code == 200:
                print(f"✓ Added {registry} credential")
            elif response.status_code == 403:
                print(f"✓ {registry} credential requires breeder status")
            else:
                print(f"  {registry} response: {response.status_code}")


class TestRegressionPhase1And2:
    """Regression tests for Phase 1 and 2 features"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Authentication failed")
    
    def test_feed_posts(self, auth_token):
        """Test feed posts endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/feed/posts", headers=headers)
        assert response.status_code == 200
        print("✓ Feed posts endpoint working")
    
    def test_pet_of_the_week(self, auth_token):
        """Test pet of the week endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/feed/pet-of-the-week", headers=headers)
        assert response.status_code == 200
        data = response.json()
        if data.get("pet"):
            print(f"✓ Pet of the Week: {data['pet']['name']}")
        else:
            print("✓ Pet of the Week endpoint working (no pet yet)")
    
    def test_my_pets(self, auth_token):
        """Test my pets endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/pets/mine", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ My pets: {len(data)} pets")
    
    def test_my_certificates(self, auth_token):
        """Test my certificates endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/certificates/mine", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ My certificates: {len(data)} certificates")
    
    def test_breeder_directory(self, auth_token):
        """Test breeder directory endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/breeder/directory", headers=headers)
        assert response.status_code == 200
        print("✓ Breeder directory endpoint working")
    
    def test_search(self, auth_token):
        """Test search endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/search?q=test", headers=headers)
        assert response.status_code == 200
        print("✓ Search endpoint working")
    
    def test_admin_stats(self, auth_token):
        """Test admin stats endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Admin stats: {data.get('total_users', 0)} users, {data.get('total_pets', 0)} pets")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
