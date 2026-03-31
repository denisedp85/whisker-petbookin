# Test Credentials
# Agent writes here when creating/modifying auth credentials (admin accounts, test users).
# Testing agent reads this before auth tests. Fork/continuation agents read on startup.

## Admin Account
- **Email:** admin@petbookin.com
- **Password:** Admin123!Petbookin
- **Role:** Admin (full access to admin dashboard, user management, content moderation)

## Test User Account (Optional - can be created via signup)
- **Email:** testuser@petbookin.com  
- **Password:** Test123!User
- **Role:** Regular User

**Note:** Admin user is seeded automatically via /app/backend/seed_admin.py script