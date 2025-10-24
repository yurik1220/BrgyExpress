# Firebase FCM Setup for BrgyExpress Backend

## Overview
The backend now supports both Expo and Firebase Cloud Messaging (FCM) for push notifications. This allows the mobile app to use FCM tokens on Android while maintaining Expo compatibility.

## Setup Steps

### 1. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `brgyexpress-notification`
3. Go to Project Settings (gear icon) → Service Accounts
4. Click "Generate new private key"
5. Download the JSON file

### 2. Set Environment Variable

Add the service account key to your environment variables:

**For local development (.env file):**
```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"brgyexpress-notification",...}
```

**For production (Render/Heroku):**
Set the `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable with the entire JSON content as a string.

### 3. Test the Setup

1. Start the backend server
2. Check the console for: `🔥 Firebase Admin SDK initialized`
3. Send a test notification from the mobile app
4. Check server logs for FCM notification success

## How It Works

- **Android**: Mobile app gets FCM tokens and sends them to `/api/save-push-token`
- **iOS**: Mobile app gets Expo tokens and sends them to `/api/save-push-token`
- **Backend**: Automatically detects token type and sends via appropriate service
- **Fallback**: If FCM fails, notifications gracefully degrade

## Token Types

- **Expo tokens**: Start with `ExponentPushToken[` or `ExpoPushToken[`
- **FCM tokens**: Long alphanumeric strings (typically 150+ characters)

## Troubleshooting

- If you see "Firebase Admin not initialized", check your service account key
- If FCM notifications fail, check Firebase project permissions
- Expo tokens will continue to work even if FCM is not configured
