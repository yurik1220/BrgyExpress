# Test script to verify account disabling functionality
$API_BASE = "http://localhost:5000"

Write-Host "🧪 Testing Account Disable Functionality" -ForegroundColor Cyan
Write-Host ""

# 1. Test admin login
Write-Host "1. Testing admin login..." -ForegroundColor Yellow
$adminBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $adminResponse = Invoke-RestMethod -Uri "$API_BASE/api/admin/login" -Method POST -Body $adminBody -ContentType "application/json"
    
    if ($adminResponse.success) {
        Write-Host "✅ Admin login successful" -ForegroundColor Green
        $adminToken = $adminResponse.token
    } else {
        Write-Host "❌ Admin login failed. Please check admin credentials." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Admin login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Get list of users
Write-Host ""
Write-Host "2. Getting list of users..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    $usersResponse = Invoke-RestMethod -Uri "$API_BASE/api/admin/users" -Method GET -Headers $headers
    
    if ($usersResponse.success) {
        Write-Host "✅ Users list retrieved" -ForegroundColor Green
        $users = $usersResponse.data
        if ($users.Count -gt 0) {
            $testUser = $users[0]
            Write-Host "   Found test user: $($testUser.email) (ID: $($testUser.id), Clerk ID: $($testUser.clerk_id))" -ForegroundColor Cyan
        } else {
            Write-Host "❌ No users found to test with" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Failed to get users list" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to get users list: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Disable the user account
Write-Host ""
Write-Host "3. Disabling user account..." -ForegroundColor Yellow
$disableBody = @{
    action = "disable"
} | ConvertTo-Json

try {
    $disableResponse = Invoke-RestMethod -Uri "$API_BASE/api/admin/users/$($testUser.id)/action" -Method POST -Body $disableBody -ContentType "application/json" -Headers $headers
    
    if ($disableResponse.success) {
        Write-Host "✅ User account disabled successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to disable user account" -ForegroundColor Red
        Write-Host "Response: $($disableResponse | ConvertTo-Json)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to disable user account: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 4. Test API call with disabled user (should be blocked)
Write-Host ""
Write-Host "4. Testing API call with disabled user..." -ForegroundColor Yellow
$apiBody = @{
    clerk_id = $testUser.clerk_id
    reaction_type = "like"
} | ConvertTo-Json

try {
    $apiResponse = Invoke-RestMethod -Uri "$API_BASE/api/announcements/1/reactions" -Method POST -Body $apiBody -ContentType "application/json"
    Write-Host "❌ API should have blocked disabled user" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 403) {
        $errorResponse = $_.Exception.Response | ConvertFrom-Json
        if ($errorResponse.code -eq "ACCOUNT_DISABLED") {
            Write-Host "✅ API correctly blocked disabled user" -ForegroundColor Green
            Write-Host "   Message: $($errorResponse.message)" -ForegroundColor Cyan
        } else {
            Write-Host "❌ API blocked user but with wrong error code" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ API should have blocked disabled user (HTTP $statusCode)" -ForegroundColor Red
    }
}

# 5. Re-enable the user account
Write-Host ""
Write-Host "5. Re-enabling user account..." -ForegroundColor Yellow
$enableBody = @{
    action = "enable"
} | ConvertTo-Json

try {
    $enableResponse = Invoke-RestMethod -Uri "$API_BASE/api/admin/users/$($testUser.id)/action" -Method POST -Body $enableBody -ContentType "application/json" -Headers $headers
    
    if ($enableResponse.success) {
        Write-Host "✅ User account enabled successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to enable user account" -ForegroundColor Red
        Write-Host "Response: $($enableResponse | ConvertTo-Json)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to enable user account: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 6. Test API call with enabled user (should work)
Write-Host ""
Write-Host "6. Testing API call with enabled user..." -ForegroundColor Yellow
try {
    $apiResponse2 = Invoke-RestMethod -Uri "$API_BASE/api/announcements/1/reactions" -Method POST -Body $apiBody -ContentType "application/json"
    Write-Host "✅ API call succeeded with enabled user" -ForegroundColor Green
} catch {
    $statusCode2 = $_.Exception.Response.StatusCode.value__
    if ($statusCode2 -eq 404) {
        Write-Host "✅ API call succeeded with enabled user (404 expected if announcement doesn't exist)" -ForegroundColor Green
    } else {
        Write-Host "❌ API call failed with enabled user (HTTP $statusCode2)" -ForegroundColor Red
        $errorResponse2 = $_.Exception.Response | ConvertFrom-Json
        Write-Host "Response: $($errorResponse2 | ConvertTo-Json)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎉 Account disable functionality test completed!" -ForegroundColor Green

