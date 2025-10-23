#!/bin/bash

# Test script to verify account disabling functionality
API_BASE="http://localhost:5000"

echo "🧪 Testing Account Disable Functionality"
echo ""

# 1. Test admin login
echo "1. Testing admin login..."
ADMIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo "$ADMIN_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Admin login successful"
  ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
  echo "❌ Admin login failed. Please check admin credentials."
  exit 1
fi

# 2. Get list of users
echo ""
echo "2. Getting list of users..."
USERS_RESPONSE=$(curl -s -X GET "$API_BASE/api/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$USERS_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Users list retrieved"
  # Extract first user ID (simplified)
  USER_ID=$(echo "$USERS_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  CLERK_ID=$(echo "$USERS_RESPONSE" | grep -o '"clerk_id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   Found test user with ID: $USER_ID, Clerk ID: $CLERK_ID"
else
  echo "❌ Failed to get users list"
  exit 1
fi

# 3. Disable the user account
echo ""
echo "3. Disabling user account..."
DISABLE_RESPONSE=$(curl -s -X POST "$API_BASE/api/admin/users/$USER_ID/action" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"disable"}')

if echo "$DISABLE_RESPONSE" | grep -q '"success":true'; then
  echo "✅ User account disabled successfully"
else
  echo "❌ Failed to disable user account"
  echo "Response: $DISABLE_RESPONSE"
  exit 1
fi

# 4. Test API call with disabled user (should be blocked)
echo ""
echo "4. Testing API call with disabled user..."
API_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_BASE/api/announcements/1/reactions" \
  -H "Content-Type: application/json" \
  -d "{\"clerk_id\":\"$CLERK_ID\",\"reaction_type\":\"like\"}")

HTTP_CODE="${API_RESPONSE: -3}"
API_BODY="${API_RESPONSE%???}"

if [ "$HTTP_CODE" = "403" ]; then
  if echo "$API_BODY" | grep -q "ACCOUNT_DISABLED"; then
    echo "✅ API correctly blocked disabled user"
    echo "   Message: $(echo "$API_BODY" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
  else
    echo "❌ API blocked user but with wrong error code"
  fi
else
  echo "❌ API should have blocked disabled user (HTTP $HTTP_CODE)"
  echo "Response: $API_BODY"
fi

# 5. Re-enable the user account
echo ""
echo "5. Re-enabling user account..."
ENABLE_RESPONSE=$(curl -s -X POST "$API_BASE/api/admin/users/$USER_ID/action" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"enable"}')

if echo "$ENABLE_RESPONSE" | grep -q '"success":true'; then
  echo "✅ User account enabled successfully"
else
  echo "❌ Failed to enable user account"
  echo "Response: $ENABLE_RESPONSE"
  exit 1
fi

# 6. Test API call with enabled user (should work)
echo ""
echo "6. Testing API call with enabled user..."
API_RESPONSE2=$(curl -s -w "%{http_code}" -X POST "$API_BASE/api/announcements/1/reactions" \
  -H "Content-Type: application/json" \
  -d "{\"clerk_id\":\"$CLERK_ID\",\"reaction_type\":\"like\"}")

HTTP_CODE2="${API_RESPONSE2: -3}"
API_BODY2="${API_RESPONSE2%???}"

if [ "$HTTP_CODE2" = "200" ] || [ "$HTTP_CODE2" = "201" ]; then
  echo "✅ API call succeeded with enabled user"
elif [ "$HTTP_CODE2" = "404" ]; then
  echo "✅ API call succeeded with enabled user (404 expected if announcement doesn't exist)"
else
  echo "❌ API call failed with enabled user (HTTP $HTTP_CODE2)"
  echo "Response: $API_BODY2"
fi

echo ""
echo "🎉 Account disable functionality test completed!"

