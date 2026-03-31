# 🎯 How to Get Free MEGA Tier (Owner Access)

## 🔧 **Quick Fix - Claim MEGA Tier via Browser Console**

Since you're the admin/owner, I added an endpoint that lets you claim MEGA tier for free without payment.

### **Steps to Claim MEGA Tier:**

1. **Login to petbookin.com** as admin
2. **Open Browser Console:**
   - Press `F12` OR
   - Right-click → Inspect → Console tab
3. **Run this command:**

```javascript
// Get your auth token from localStorage
const token = localStorage.getItem('token');

// Call the claim MEGA tier endpoint
fetch('https://petbookin.com/api/user/claim-mega-tier', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => {
  console.log('✅ MEGA TIER ACTIVATED!', data);
  alert('MEGA tier activated! Refresh the page to see changes.');
})
.catch(err => console.error('Error:', err));
```

4. **Press Enter**
5. **You should see**: `✅ MEGA TIER ACTIVATED!`
6. **Refresh the page**
7. **Check Settings** - Should show MEGA tier
8. **Try AI Write** - Should work unlimited

---

## 🎉 **After Claiming MEGA:**

You'll have:
- ✅ **Unlimited AI-generated bios**
- ✅ **Unlimited listings**
- ✅ **Priority support**
- ✅ **All premium features**
- ✅ **Breeder registry access**
- ✅ **Event creation**
- ✅ **Certificate generation**

---

## 🔄 **Alternative Method (After Redeployment):**

Once you redeploy the latest changes, you can also use this endpoint directly in the membership page or via admin panel.

---

## ⚠️ **Note:**

This endpoint is **admin-only**. Regular users cannot claim free MEGA tier - they must pay. Only admin accounts (like yours) can use this.

---

## 💡 **For Other Admins:**

If you want to give MEGA tier to someone else:

1. Login as admin
2. Use this command (replace USER_ID):

```javascript
const token = localStorage.getItem('token');
const userId = 'USER_ID_HERE';

fetch(`https://petbookin.com/api/admin/set-mega-tier/${userId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('✅ User upgraded:', data))
.catch(err => console.error('Error:', err));
```

---

**Try it now and let me know if it works!** 🚀
