# Super Admin Setup Guide

## 🎯 Overview
This guide explains how to set up and use the Super Admin role in BrgyExpress Web Admin Dashboard. The Super Admin can manage other admin accounts, including creating new admins and disabling existing ones.

## 🔧 Database Setup

### 1. Run the Database Migration
Execute the SQL script to add the status column and enforce the single super admin rule:

```bash
# Connect to your PostgreSQL database and run:
psql -d your_database_name -f backend/admin_management_setup.sql
```

Or manually run the SQL commands:
```sql
-- Add status column
ALTER TABLE admins ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Update existing admins
UPDATE admins SET status = 'active' WHERE status IS NULL;

-- Create unique constraint for single super admin
CREATE UNIQUE INDEX IF NOT EXISTS only_one_super_admin
ON admins ((CASE WHEN role = 'super_admin' AND status = 'active' THEN 1 END));

-- Add status constraint
ALTER TABLE admins ADD CONSTRAINT check_status 
CHECK (status IN ('active', 'disabled'));
```

### 2. Create Initial Super Admin
Use the existing admin creation endpoint to create a super admin:

```bash
curl -X POST http://localhost:5000/api/admin/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "superadmin123",
    "full_name": "Super Administrator",
    "role": "super_admin"
  }'
```

## 🚀 Features

### ✅ Super Admin Capabilities
- **View All Admin Accounts** - See all admin accounts with their roles and status
- **Create New Admins** - Add new admin or super admin accounts
- **Disable/Enable Admins** - Toggle admin account status
- **Single Super Admin Rule** - Only one active super admin at a time
- **Role-Based Access** - Super admin features only visible to super admins

### ✅ Security Features
- **Database-Level Constraints** - Unique constraint ensures only one active super admin
- **Automatic Transitions** - When creating a new super admin, the old one is automatically disabled
- **Token-Based Authentication** - All admin management endpoints require valid super admin token
- **Input Validation** - All form inputs are validated on both frontend and backend

## 📱 User Interface

### Sidebar Navigation
- The "Manage Admin Accounts" tab only appears for users with `role = 'super_admin'`
- Uses a shield icon to indicate administrative privileges

### Admin Management Page
- **Admin Grid View** - Cards showing admin information, role, and status
- **Add New Admin Modal** - Form to create new admin accounts
- **Status Toggle Buttons** - Enable/disable admin accounts
- **Real-time Updates** - Changes are immediately reflected in the UI

### Admin Cards Display
- **Avatar** - First letter of full name
- **Full Name & Username** - Clear identification
- **Role Badges** - Visual indicators for Admin vs Super Admin
- **Status Badges** - Active (green) vs Disabled (red)
- **Creation Date** - When the account was created
- **Action Buttons** - Enable/disable functionality

## 🔐 API Endpoints

### Authentication Required
All admin management endpoints require a valid super admin token in the Authorization header:
```
Authorization: Bearer <base64_token>
```

### Available Endpoints

#### 1. List All Admin Accounts
- **GET** `/api/admin/accounts`
- **Response**: Array of admin objects with id, username, full_name, role, status, created_at

#### 2. Create New Admin Account
- **POST** `/api/admin/accounts`
- **Body**: `{ username, password, full_name, role }`
- **Roles**: `admin` or `super_admin`
- **Response**: Created admin object

#### 3. Disable Admin Account
- **PATCH** `/api/admin/accounts/:id/disable`
- **Response**: Success message

#### 4. Enable Admin Account
- **PATCH** `/api/admin/accounts/:id/enable`
- **Response**: Success message

## 🛡️ Security Rules

### Single Super Admin Rule
- Only **one** admin can have `role = 'super_admin'` and `status = 'active'` at any time
- When creating a new super admin:
  - New account is created with `status = 'active'`
  - Previous super admin is automatically set to `status = 'disabled'`
- This is enforced at the database level with a unique index

### Access Control
- Admin management features are only visible to super admins
- All admin management API endpoints require super admin authentication
- Regular admins cannot access admin management functionality

### Data Protection
- Passwords are hashed using bcrypt before storage
- Sensitive data (passwords) are never returned in API responses
- Input validation prevents SQL injection and XSS attacks

## 🚀 Usage Instructions

### 1. Initial Setup
1. Run the database migration script
2. Create the first super admin account
3. Login with super admin credentials
4. Access "Manage Admin Accounts" from the sidebar

### 2. Creating Admin Accounts
1. Click "Add New Admin" button
2. Fill in the form:
   - **Username**: Unique identifier (3-50 characters)
   - **Password**: Secure password (minimum 6 characters)
   - **Full Name**: Display name (2-100 characters)
   - **Role**: Choose Admin or Super Admin
3. Click "Create Admin"

### 3. Managing Existing Admins
1. View all admin accounts in the grid
2. Use "Disable" button to deactivate an account
3. Use "Enable" button to reactivate a disabled account
4. Status changes are immediate and reflected in the UI

### 4. Super Admin Transitions
- When creating a new super admin, the old super admin is automatically disabled
- Only one super admin can be active at a time
- This ensures system security and prevents conflicts

## 🔧 Troubleshooting

### Common Issues

#### 1. "Super admin access required" Error
- **Cause**: User is not logged in as super admin
- **Solution**: Login with super admin credentials

#### 2. "Cannot disable the last active super admin" Error
- **Cause**: Trying to disable the only active super admin
- **Solution**: Create another super admin first, then disable the old one

#### 3. "Username already exists" Error
- **Cause**: Username is already taken
- **Solution**: Choose a different username

#### 4. Database Constraint Violations
- **Cause**: Multiple super admins with active status
- **Solution**: Run the database migration script to add proper constraints

### Database Issues
If you encounter database constraint issues:
1. Check that the unique index was created properly
2. Verify that only one super admin has `status = 'active'`
3. Run the migration script again if needed

## 📋 File Structure

```
web-admin/
├── src/
│   ├── pages/
│   │   └── admin-management.js      # Main admin management page
│   ├── styles/
│   │   └── AdminManagement.css      # Styling for admin management
│   ├── components/
│   │   └── Sidebar.js               # Updated with super admin tab
│   └── app.js                       # Updated routing
└── SUPER_ADMIN_SETUP.md             # This guide

backend/
├── server.js                        # Updated with admin management endpoints
└── admin_management_setup.sql       # Database migration script
```

## 🎉 Success Indicators

You'll know the setup is working correctly when:
- ✅ "Manage Admin Accounts" tab appears in the sidebar for super admins
- ✅ Admin management page loads and shows existing admin accounts
- ✅ You can create new admin accounts successfully
- ✅ You can disable/enable admin accounts
- ✅ Only one super admin can be active at a time
- ✅ Regular admins cannot see the admin management tab

## 🔄 Next Steps

After successful setup:
1. Create additional admin accounts as needed
2. Train other super admins on the system
3. Set up proper password policies
4. Consider implementing additional security measures (2FA, audit logs, etc.)

For support or questions, refer to the main ADMIN_SETUP.md file or check the backend logs for detailed error messages.
