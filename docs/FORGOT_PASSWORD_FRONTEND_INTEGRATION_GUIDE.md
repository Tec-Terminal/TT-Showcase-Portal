# Forgot Password & Reset Password - Frontend Integration Guide

This guide explains how to integrate the forgot password and reset password functionality into your frontend application.

## Overview

The forgot password flow consists of two main steps:
1. **Request Password Reset** - User enters their email and receives a reset link
2. **Reset Password** - User clicks the link and sets a new password

## API Endpoints

### 1. Request Password Reset

**Endpoint:** `POST /api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Note:** The API returns the same message whether the user exists or not (security best practice).

### 2. Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "token": "reset_token_from_email_link",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

**Error Responses:**
- `400 Bad Request` - Invalid or expired token
  ```json
  {
    "statusCode": 400,
    "message": "Invalid or expired password reset token.",
    "error": "Bad Request"
  }
  ```

## Frontend Implementation

### Step 1: Forgot Password Form

Create a component/page for users to request a password reset:

```tsx
// ForgotPassword.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form'; // or your form library
import axios from 'axios';

interface ForgotPasswordFormData {
  email: string;
}

const ForgotPassword: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/auth/forgot-password', {
        email: data.email,
      });
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="forgot-password-success">
        <h2>Check Your Email</h2>
        <p>
          If an account with that email exists, a password reset link has been sent.
          Please check your email and click the link to reset your password.
        </p>
        <p className="text-muted">
          The link will expire in 1 hour.
        </p>
        <a href="/login">Back to Login</a>
      </div>
    );
  }

  return (
    <div className="forgot-password-form">
      <h2>Forgot Password?</h2>
      <p>Enter your email address and we'll send you a link to reset your password.</p>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
            placeholder="Enter your email"
          />
          {errors.email && <span className="error">{errors.email.message}</span>}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <a href="/login">Back to Login</a>
    </div>
  );
};

export default ForgotPassword;
```

### Step 2: Reset Password Page

Create a page that handles the password reset when users click the link from their email:

```tsx
// ResetPassword.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface ResetPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const token = searchParams.get('token');
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordFormData>();

  const newPassword = watch('newPassword');

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    if (data.newPassword !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/auth/reset-password', {
        token: token,
        newPassword: data.newPassword,
      });
      
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="reset-password-success">
        <h2>Password Reset Successful!</h2>
        <p>Your password has been reset successfully. You can now log in with your new password.</p>
        <p>Redirecting to login page...</p>
        <a href="/login">Go to Login</a>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="reset-password-error">
        <h2>Invalid Reset Link</h2>
        <p>The password reset link is invalid or has expired. Please request a new password reset.</p>
        <a href="/forgot-password">Request New Reset Link</a>
      </div>
    );
  }

  return (
    <div className="reset-password-form">
      <h2>Reset Your Password</h2>
      <p>Please enter your new password below.</p>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label htmlFor="newPassword">New Password</label>
          <input
            id="newPassword"
            type="password"
            {...register('newPassword', {
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters long',
              },
            })}
            placeholder="Enter new password"
          />
          {errors.newPassword && <span className="error">{errors.newPassword.message}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) =>
                value === newPassword || 'Passwords do not match',
            })}
            placeholder="Confirm new password"
          />
          {errors.confirmPassword && <span className="error">{errors.confirmPassword.message}</span>}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      <a href="/login">Back to Login</a>
    </div>
  );
};

export default ResetPassword;
```

### Step 3: Add Routes

Add routes to your routing configuration:

```tsx
// App.tsx or your router file
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Login from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* other routes */}
      </Routes>
    </BrowserRouter>
  );
}
```

### Step 4: Update Login Page

Add a "Forgot Password?" link to your login page:

```tsx
// Login.tsx
const Login: React.FC = () => {
  return (
    <div className="login-form">
      {/* existing login form */}
      <a href="/forgot-password" className="forgot-password-link">
        Forgot Password?
      </a>
    </div>
  );
};
```

## React Native Implementation

For React Native applications, the implementation is similar but with platform-specific considerations:

```tsx
// ForgotPasswordScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Linking } from 'react-native';
import axios from 'axios';

const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('YOUR_API_URL/api/auth/forgot-password', {
        email,
      });
      
      Alert.alert(
        'Check Your Email',
        'If an account with that email exists, a password reset link has been sent. Please check your email.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password?</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleForgotPassword}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
      </TouchableOpacity>
    </View>
  );
};
```

For handling the reset link in React Native, you'll need to configure deep linking:

```tsx
// ResetPasswordScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Linking } from 'react-native';
import { useRoute } from '@react-navigation/native';
import axios from 'axios';

const ResetPasswordScreen: React.FC = ({ route, navigation }) => {
  const token = route.params?.token;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      await axios.post('YOUR_API_URL/api/auth/reset-password', {
        token,
        newPassword,
      });
      
      Alert.alert(
        'Success',
        'Your password has been reset successfully. You can now log in with your new password.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <TextInput
        style={styles.input}
        placeholder="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleResetPassword}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Resetting...' : 'Reset Password'}</Text>
      </TouchableOpacity>
    </View>
  );
};
```

## Next.js Implementation

For Next.js applications, you can use server-side rendering and API routes:

```tsx
// pages/forgot-password.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post('/api/auth/forgot-password', { email });
      setSuccess(true);
    } catch (error: any) {
      alert(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div>
        <h1>Check Your Email</h1>
        <p>If an account with that email exists, a password reset link has been sent.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Reset Link'}
      </button>
    </form>
  );
}
```

```tsx
// pages/reset-password.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/auth/reset-password', {
        token,
        newPassword,
      });
      alert('Password reset successful! Redirecting to login...');
      router.push('/login');
    } catch (error: any) {
      alert(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New Password"
        required
        minLength={8}
      />
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm Password"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  );
}
```

## Environment Variables

Make sure to set the following environment variable on the backend:

```env
FRONTEND_URL=https://your-frontend-domain.com
# or
BASE_URL=https://your-backend-domain.com
```

The password reset email will include a link pointing to:
```
${FRONTEND_URL}/reset-password?token=<reset_token>
```

## Security Considerations

1. **Token Expiry**: Password reset tokens expire after 1 hour
2. **Same Response**: The API returns the same message whether the email exists or not (prevents email enumeration)
3. **Password Strength**: Ensure your frontend validates password strength (minimum 8 characters)
4. **HTTPS**: Always use HTTPS in production to protect tokens during transmission
5. **Token in URL**: The reset token is passed as a query parameter. While this is common practice, consider handling it securely on the frontend

## Testing

### Test Forgot Password Flow:

1. Navigate to `/forgot-password`
2. Enter a valid email address
3. Check that a success message is displayed
4. Check the email inbox for the reset link
5. Click the reset link
6. Verify that you're redirected to `/reset-password` with the token
7. Enter a new password and confirm it
8. Verify that the password is reset and you're redirected to login

### Test Error Cases:

1. **Invalid Token**: Try accessing `/reset-password?token=invalid_token`
2. **Expired Token**: Wait for the token to expire (1 hour) and try to use it
3. **Password Mismatch**: Try entering different passwords in the confirm field
4. **Short Password**: Try entering a password less than 8 characters

## Troubleshooting

### Email not received?
- Check spam/junk folder
- Verify email configuration on the backend
- Check backend logs for email sending errors

### Token invalid/expired?
- Tokens expire after 1 hour
- Request a new password reset link
- Verify the token is being extracted correctly from the URL

### CORS Issues?
- Ensure your frontend URL is added to CORS allowed origins on the backend
- Check that API calls are going to the correct backend URL

## API Base URL Configuration

If your frontend and backend are on different domains, configure your API client:

```tsx
// api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
```

Then use this client in your components:

```tsx
import apiClient from './api/client';

// In your component
await apiClient.post('/auth/forgot-password', { email });
```

