# Spam Scoring & Analytics System - Implementation Summary

## Overview
The Spam Scoring and Data Analytics feature has been successfully integrated into the BrgyExpress system. This feature tracks user behavior across all request types and automatically manages account status based on spam points.

---

## 🎯 Key Features Implemented

### 1. **Automatic Spam Point System**
- Users receive **+1 spam point** for each rejected submission
- Tracking covers:
  - Document Requests
  - ID Requests  
  - Incident Reports

### 2. **Automatic Account Management**
- **5 spam points**: User is temporarily disabled for 24 hours
- **7 spam points**: User is permanently disabled (requires admin intervention)
- Temporary bans automatically lift after 24 hours
- Permanent bans require manual admin action to lift

### 3. **Comprehensive Analytics Dashboard**
Accessible via **Analytics → Spam Analytics** tab in the web admin panel.

**Metrics Displayed:**
- Total Rejected Submissions
- Average Spam Score per User
- Users Disabled (Temp vs Perm)
- Rejection Rate (%)
- Top 10 Offenders with detailed breakdown

---

## 📊 Database Schema Changes

### New Columns in `users` Table
```sql
- spam_points INTEGER DEFAULT 0
- disabled_at TIMESTAMPTZ
- account_status TEXT DEFAULT 'active'
```

### New Table: `spam_logs`
Tracks all spam-related events for auditing and analytics:
```sql
CREATE TABLE spam_logs (
    id SERIAL PRIMARY KEY,
    clerk_id VARCHAR(255) NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    request_id INTEGER,
    rejection_reason TEXT,
    spam_points_before INTEGER DEFAULT 0,
    spam_points_after INTEGER DEFAULT 0,
    account_status_before TEXT,
    account_status_after TEXT,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (clerk_id) REFERENCES users (clerk_id) ON DELETE CASCADE
);
```

---

## 🔌 Backend API Endpoints

### 1. GET `/api/analytics/spam`
**Purpose**: Fetch spam analytics data for admin dashboard
**Returns**:
```json
{
  "success": true,
  "data": {
    "totalRejectedSubmissions": 45,
    "averageSpamScore": "2.34",
    "usersDisabled": {
      "temp": 3,
      "perm": 1,
      "total": 4
    },
    "topOffenders": [...],
    "rejectionRate": 12.5
  }
}
```

### 2. PATCH `/api/users/:clerkId/lift-ban`
**Purpose**: Manually lift permanent ban on a user (admin only)
**Returns**:
```json
{
  "success": true,
  "message": "User ban lifted successfully",
  "user": {
    "clerkId": "...",
    "account_status": "active",
    "spam_points": 0
  }
}
```

### 3. GET `/api/users/:clerkId/spam-score`
**Purpose**: Get user's own spam score
**Returns**:
```json
{
  "spamPoints": 3,
  "accountStatus": "active",
  "disabledAt": null,
  "message": "You have 3 spam points"
}
```

---

## 🖥️ Web Admin Interface Updates

### Account Maintenance Page
- **New Column**: "Spam Score" shows points (e.g., 3/7)
- **Color Coding**:
  - Green: < 5 points
  - Orange: 5-6 points  
  - Red: 7+ points
- **Account Status Display**: Shows active/disabled_temp/disabled_perm
- **Lift Ban Button**: Admins can manually lift permanent bans
- **Disabled Since**: Shows timestamp when user was disabled

### Analytics Dashboard
- **New Tab**: "Spam Analytics"
- **Visual Cards** showing key metrics
- **Top Offenders Table** with rankings
- **Real-time Data** from backend

---

## 🚫 Request Blocking Logic

### Automatic Enforcement
When users attempt to submit any request:
1. System checks `account_status` field
2. **Temporary Disable**: Shows remaining hours and blocks submission
3. **Permanent Disable**: Shows spam points and directs to contact admin
4. Auto-lift expired temporary bans if they're past 24 hours

### Error Response for Disabled Users
```json
{
  "error": "Account temporarily disabled",
  "message": "Your account is temporarily disabled due to spam points (5/7). It will be re-enabled in approximately 12 hours.",
  "spamPoints": 5,
  "status": "disabled_temp",
  "remainingHours": 12
}
```

---

## 🔄 Automatic Background Processing

### Hourly Auto-Lift Check
- Runs every 60 minutes
- Finds users with `disabled_temp` status older than 24 hours
- Automatically lifts the ban and logs the action
- Sends notifications to affected users

### Spam Logging
Every spam-related event is logged with:
- User ID and request details
- Spam points before/after
- Account status before/after
- Timestamp and action type

---

## 📈 Analytics Insights

### Metrics Tracked
1. **Total Rejected Submissions** - Total count across all request types
2. **Average Spam Score** - Mean spam points for all users
3. **Disabled User Count** - Breakdown by temp vs permanent
4. **Top Offenders** - Users with highest spam points
5. **Rejection Rate** - Percentage of total submissions rejected

### Visualizations
- **Metric Cards**: Large, color-coded KPI displays
- **Top Offenders Table**: Ranked list with medal badges (gold/silver/bronze)
- **Status Indicators**: Color-coded for quick identification

---

## 🎨 User Experience

### For Users
- Clear error messages when account is disabled
- Information about when account will be re-enabled
- Spam points visible in account maintenance
- Transparent system with clear rules

### For Admins
- Comprehensive analytics dashboard
- Easy identification of problematic users
- Manual control over permanent bans
- Complete audit trail via spam_logs
- Visual indicators for quick status checks

---

## 🔐 Security Features

1. **Admin-only Endpoints**: Lift ban endpoint requires admin authentication
2. **Audit Logging**: All spam actions logged in audit_logs
3. **Rate Limiting**: Analytics endpoints protected with rate limiting
4. **Database Constraints**: Foreign key relationships maintain data integrity

---

## 🚀 Deployment Notes

### Database Migration
Run the following to ensure all columns exist:
```bash
# The server.js automatically adds missing columns on startup
# No manual migration needed
```

### Configuration
No additional configuration required. The system activates automatically on server startup.

### Monitoring
Check logs for spam-related events:
- `🚨 Spam tracking:` - Point increments
- `🔄 Found X users with expired temporary bans` - Auto-lift operations
- `✅ Admin X lifted permanent ban for Y` - Manual interventions

---

## 📝 Files Modified

### Backend
- `backend/server.js` - Main server file with spam tracking logic

### Web Admin
- `web-admin/src/pages/analytics.js` - Added spam analytics tab
- `web-admin/src/pages/account-maintenance.js` - Added spam score display
- `web-admin/src/app.js` - Updated routes
- `web-admin/src/components/Sidebar.js` - Removed duplicate navigation

---

## ✅ Testing Checklist

- [x] Database schema changes applied
- [x] Spam points increment on rejection
- [x] Automatic temporary disable at 5 points
- [x] Automatic permanent disable at 7 points
- [x] Auto-lift temporary bans after 24 hours
- [x] Manual lift for permanent bans works
- [x] Request blocking for disabled users
- [x] Analytics dashboard displays data
- [x] Account maintenance shows spam scores
- [x] Spam logs are created correctly
- [x] No linting errors

---

## 🎉 Implementation Complete!

The Spam Scoring and Data Analytics system is fully operational and integrated into BrgyExpress. All features have been implemented, tested, and are ready for production use.

