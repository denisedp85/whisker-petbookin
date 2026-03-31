#!/usr/bin/env python3
"""
Set user to MEGA tier (for owner/admin)
"""
import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

async def set_mega_tier(email: str):
    """Set user to MEGA tier"""
    try:
        mongo_url = os.environ.get('MONGO_URL')
        db_name = os.environ.get('DB_NAME')
        
        if not mongo_url or not db_name:
            print("❌ Missing MONGO_URL or DB_NAME")
            sys.exit(1)
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Find user
        user = await db.users.find_one({"email": email})
        
        if not user:
            print(f"❌ User not found: {email}")
            sys.exit(1)
        
        # Update to MEGA tier
        await db.users.update_one(
            {"email": email},
            {
                "$set": {
                    "membership_tier": "mega",
                    "membership_status": "active",
                    "ai_generations_used": 0  # Reset AI usage for unlimited
                }
            }
        )
        
        print(f"✅ User updated to MEGA tier!")
        print(f"📧 Email: {email}")
        print(f"👤 Name: {user.get('name', 'N/A')}")
        print(f"🎖️ New Tier: MEGA (unlimited access)")
        print(f"💎 Status: Active")
        print(f"🤖 AI Generations: Unlimited")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else "dedape1985@gmail.com"
    asyncio.run(set_mega_tier(email))
