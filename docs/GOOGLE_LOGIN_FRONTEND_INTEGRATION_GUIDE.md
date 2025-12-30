# Google OAuth Login - Frontend Integration Guide

This guide explains how to integrate Google OAuth login functionality into your frontend application.

## Overview

Google OAuth login allows users to sign in using their Google account without entering a password. The flow consists of:

1. User clicks "Sign in with Google" button
2. User is redirected to Google's authorization page
3. User grants permission
4. Google redirects back to your backend callback URL
5. Backend processes the OAuth response and generates JWT tokens
6. User is redirected to frontend with tokens in the URL (frontend handles token storage)

## Backend Setup

### Prerequisites

1. **Google Cloud Console Setup**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google+ API (or Google Identity API)
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Configure OAuth consent screen if prompted
   - For application type, select "Web application"
   - Add authorized redirect URIs:
     - Development: `http://localhost:8000/api/auth/google/callback`
     - Production: `https://your-backend-domain.com/api/auth/google/callback`

2. **Environment Variables**

   Add these to your backend `.env` file:

   ```env
   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:8000/api/auth/google/callback
   
   # Base URL for redirect after login
   BASE_URL=http://localhost:8000
   FRONTEND_URL=http://localhost:3000
   ```

3. **Run Database Migration** (if needed)

   The User model should already support OAuth login (users created via Google will have empty passwords).

## API Endpoints

### 1. Initiate Google Login

**Endpoint:** `GET /api/auth/google/login`

**Description:** This endpoint initiates the Google OAuth flow. The user will be redirected to Google's authorization page.

**Usage:** Direct the user's browser to this URL or use it as the `href` for a "Sign in with Google" button.

**Example:**
```
http://localhost:8000/api/auth/google/login
```

**Response:** 
- Redirects to Google's authorization page
- No JSON response (browser redirect)

### 2. Google OAuth Callback

**Endpoint:** `GET /api/auth/google/callback`

**Description:** This is the callback URL that Google redirects to after authentication. This endpoint is handled automatically by the backend and should not be called directly from the frontend.

**Response:**
- Redirects to frontend with tokens in query parameters:
  ```
  ${FRONTEND_URL}/auth/google/callback?userId=<user_id>&name=<email>&accessToken=<access_token>&refreshToken=<refresh_token>
  ```

## Frontend Implementation

### Step 1: Create Google Login Button

```tsx
// GoogleLoginButton.tsx
import React from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const GoogleLoginButton: React.FC = () => {
  const handleGoogleLogin = () => {
    // Redirect to backend Google login endpoint
    window.location.href = `${API_BASE_URL}/api/auth/google/login`;
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className="google-login-button"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 20px',
        backgroundColor: '#fff',
        border: '1px solid #dadce0',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 500,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        style={{ marginRight: '8px' }}
      >
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
        />
      </svg>
      Sign in with Google
    </button>
  );
};

export default GoogleLoginButton;
```

### Step 2: Handle OAuth Callback

Create a callback page/component that handles the redirect from Google:

```tsx
// GoogleCallback.tsx or pages/auth/google/callback.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const GoogleCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = () => {
      try {
        // Extract tokens from URL query parameters
        const userId = searchParams.get('userId');
        const email = searchParams.get('name');
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');

        if (!accessToken || !refreshToken) {
          setError('Authentication failed. Missing tokens.');
          setLoading(false);
          return;
        }

        // Store tokens in your preferred storage (localStorage, sessionStorage, secure cookie, etc.)
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        // Optionally store user info
        if (userId) {
          localStorage.setItem('userId', userId);
        }
        if (email) {
          localStorage.setItem('userEmail', email);
        }

        // Redirect to dashboard or home page
        navigate('/dashboard');
      } catch (err) {
        console.error('Google callback error:', err);
        setError('An error occurred during authentication. Please try again.');
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="google-callback-loading">
        <h2>Completing sign in...</h2>
        <p>Please wait while we complete your Google sign in.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="google-callback-error">
        <h2>Authentication Error</h2>
        <p>{error}</p>
        <a href="/login">Return to Login</a>
      </div>
    );
  }

  return null;
};

export default GoogleCallback;
```

### Step 3: Add Routes

Add the callback route to your routing configuration:

```tsx
// App.tsx or your router file
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GoogleCallback from './pages/auth/GoogleCallback';
import Login from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        {/* other routes */}
      </Routes>
    </BrowserRouter>
  );
}
```

### Step 4: Update Login Page

Add the Google login button to your login page:

```tsx
// Login.tsx
import GoogleLoginButton from '../components/GoogleLoginButton';

const Login: React.FC = () => {
  return (
    <div className="login-container">
      <h1>Welcome Back</h1>
      
      {/* Existing email/password login form */}
      <form className="login-form">
        {/* ... existing form fields ... */}
      </form>

      {/* Divider */}
      <div className="login-divider">
        <span>OR</span>
      </div>

      {/* Google Login Button */}
      <GoogleLoginButton />

      {/* Other OAuth providers can go here */}
    </div>
  );
};
```

## Next.js Implementation

For Next.js applications, create the callback page:

```tsx
// pages/auth/google/callback.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie'; // or use your preferred method

export default function GoogleCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = () => {
      const { userId, name: email, accessToken, refreshToken } = router.query;

      if (!accessToken || !refreshToken) {
        setError('Authentication failed. Missing tokens.');
        setLoading(false);
        return;
      }

      // Store tokens
      Cookies.set('accessToken', accessToken as string, { expires: 7, secure: true, sameSite: 'strict' });
      Cookies.set('refreshToken', refreshToken as string, { expires: 30, secure: true, sameSite: 'strict' });
      
      if (userId) {
        Cookies.set('userId', userId as string, { expires: 7 });
      }

      // Redirect to dashboard
      router.push('/dashboard');
    };

    if (router.isReady) {
      handleCallback();
    }
  }, [router.isReady, router.query]);

  if (loading) {
    return (
      <div>
        <h1>Completing sign in...</h1>
        <p>Please wait while we complete your Google sign in.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1>Authentication Error</h1>
        <p>{error}</p>
        <a href="/login">Return to Login</a>
      </div>
    );
  }

  return null;
}
```

## React Native Implementation

For React Native applications, you'll need to handle deep linking:

### Step 1: Configure Deep Linking

**iOS (Info.plist):**
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>yourapp</string>
    </array>
  </dict>
</array>
```

**Android (AndroidManifest.xml):**
```xml
<activity
  android:name=".MainActivity"
  android:launchMode="singleTask">
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="yourapp" />
  </intent-filter>
</activity>
```

### Step 2: Create Google Login Component

```tsx
// GoogleLoginButton.tsx
import React from 'react';
import { TouchableOpacity, Text, Linking, Alert } from 'react-native';

const API_BASE_URL = 'YOUR_API_URL'; // e.g., 'https://api.yourapp.com'

const GoogleLoginButton: React.FC = () => {
  const handleGoogleLogin = () => {
    const googleLoginUrl = `${API_BASE_URL}/api/auth/google/login`;
    Linking.openURL(googleLoginUrl).catch((err) => {
      Alert.alert('Error', 'Failed to open Google login');
      console.error(err);
    });
  };

  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#dadce0',
        borderRadius: 4,
        padding: 12,
        marginVertical: 10,
      }}
      onPress={handleGoogleLogin}
    >
      <Text style={{ color: '#000', fontSize: 16, fontWeight: '500' }}>
        Sign in with Google
      </Text>
    </TouchableOpacity>
  );
};

export default GoogleLoginButton;
```

### Step 3: Handle Deep Link Callback

```tsx
// App.tsx or your main navigation file
import { useEffect } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const App: React.FC = () => {
  useEffect(() => {
    // Handle initial URL (if app was opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle URL while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = async (url: string) => {
    try {
      // Parse URL: yourapp://auth/google/callback?userId=...&accessToken=...&refreshToken=...
      const params = new URLSearchParams(url.split('?')[1]);
      const userId = params.get('userId');
      const email = params.get('name');
      const accessToken = params.get('accessToken');
      const refreshToken = params.get('refreshToken');

      if (accessToken && refreshToken) {
        // Store tokens
        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', refreshToken);
        
        if (userId) {
          await AsyncStorage.setItem('userId', userId);
        }
        if (email) {
          await AsyncStorage.setItem('userEmail', email);
        }

        // Navigate to home/dashboard
        navigation.navigate('Dashboard');
      }
    } catch (error) {
      console.error('Deep link handling error:', error);
    }
  };

  // ... rest of your app
};
```

**Note:** For React Native, you'll need to update the backend callback URL to use a custom URL scheme instead of HTTP redirects, or use a webview-based approach.

## Alternative: Using Google Sign-In SDK (React Native)

For a better React Native experience, consider using the official Google Sign-In SDK:

```bash
npm install @react-native-google-signin/google-signin
```

```tsx
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: 'YOUR_GOOGLE_CLIENT_ID', // From Google Cloud Console
  offlineAccess: true,
});

const handleGoogleLogin = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    
    // Send the ID token to your backend
    const response = await fetch(`${API_BASE_URL}/api/auth/google/mobile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: userInfo.idToken }),
    });
    
    const { accessToken, refreshToken } = await response.json();
    
    // Store tokens
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    
    // Navigate to dashboard
  } catch (error) {
    console.error(error);
  }
};
```

**Note:** This approach requires a custom backend endpoint that accepts the ID token from the mobile app.

## Token Storage Best Practices

### Web Applications

1. **localStorage** (Simple, but vulnerable to XSS)
   ```tsx
   localStorage.setItem('accessToken', token);
   ```

2. **httpOnly Cookies** (Recommended - Most Secure)
   ```tsx
   // Backend should set httpOnly cookies via Set-Cookie header
   // Frontend doesn't need to manually store tokens
   ```

3. **Memory/State** (Most Secure, but tokens lost on refresh)
   ```tsx
   const [tokens, setTokens] = useState(null);
   ```

### React Native

1. **AsyncStorage** (Common approach)
   ```tsx
   await AsyncStorage.setItem('accessToken', token);
   ```

2. **Secure Storage** (More secure - requires additional library)
   ```bash
   npm install react-native-keychain
   ```
   ```tsx
   import * as Keychain from 'react-native-keychain';
   await Keychain.setGenericPassword('accessToken', token);
   ```

## Error Handling

Common errors and how to handle them:

1. **User Cancels OAuth Flow**
   - User will be redirected back without tokens
   - Handle gracefully by showing a message or redirecting to login

2. **Invalid OAuth Configuration**
   - Check Google Cloud Console credentials
   - Verify callback URL matches exactly

3. **Token Expired**
   - Implement token refresh logic
   - Redirect to login if refresh fails

## Security Considerations

1. **HTTPS in Production**: Always use HTTPS in production for OAuth flows
2. **Token Storage**: Use secure storage methods (httpOnly cookies, secure storage)
3. **Token Expiry**: Implement token refresh logic
4. **CSRF Protection**: Consider implementing CSRF tokens for OAuth flows
5. **State Parameter**: The backend should validate the state parameter (if implemented)

## Testing

### Development Testing:

1. Start your backend server
2. Ensure Google OAuth credentials are configured
3. Navigate to login page
4. Click "Sign in with Google"
5. Complete Google authentication
6. Verify redirect to callback page
7. Verify tokens are stored correctly
8. Verify redirect to dashboard/home

### Production Checklist:

- [ ] Google OAuth credentials are configured
- [ ] Callback URL is correctly set in Google Cloud Console
- [ ] HTTPS is enabled
- [ ] FRONTEND_URL environment variable is set correctly
- [ ] Token storage is secure (httpOnly cookies or secure storage)
- [ ] Error handling is implemented
- [ ] Token refresh logic is implemented

## Troubleshooting

### "redirect_uri_mismatch" Error

- **Cause**: Callback URL doesn't match Google Cloud Console configuration
- **Solution**: Verify callback URL in Google Cloud Console matches exactly: `${BASE_URL}/api/auth/google/callback`

### Tokens Not Being Stored

- **Cause**: Callback page not handling URL parameters correctly
- **Solution**: Check that URLSearchParams or query parsing is working correctly

### CORS Issues

- **Cause**: Frontend and backend on different origins
- **Solution**: Ensure backend CORS configuration allows frontend origin

### Deep Linking Not Working (React Native)

- **Cause**: URL scheme not configured correctly
- **Solution**: Verify Info.plist (iOS) and AndroidManifest.xml (Android) configurations

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)

