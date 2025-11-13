# Google Authentication Setup Guide

## Prerequisites
1. A Supabase project (create one at https://app.supabase.com)
2. Google OAuth credentials

## Step 1: Configure Supabase

### 1.1 Enable Google Provider in Supabase
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Providers**
3. Find **Google** and enable it
4. You'll need to configure Google OAuth credentials (see Step 2)

### 1.2 Get Supabase Credentials
1. Go to **Settings** > **API**
2. Copy your **Project URL** and **anon/public key**
3. Update the `.env` file in the frontend directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your-project-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

## Step 2: Configure Google OAuth

### 2.1 Create Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure the consent screen if prompted
6. Select **Web application** as the application type
7. Add authorized redirect URIs:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
   - Replace `your-project-ref` with your actual Supabase project reference

### 2.2 Add Google Credentials to Supabase
1. Copy the **Client ID** and **Client Secret** from Google Cloud Console
2. Go back to Supabase **Authentication** > **Providers** > **Google**
3. Paste the Client ID and Client Secret
4. Save the configuration

## Step 3: Configure Deep Linking (for Mobile)

### For iOS
Add to your `app.json`:
```json
{
  "expo": {
    "scheme": "gnocchi",
    "ios": {
      "bundleIdentifier": "com.yourcompany.gnocchi"
    }
  }
}
```

### For Android
Add to your `app.json`:
```json
{
  "expo": {
    "scheme": "gnocchi",
    "android": {
      "package": "com.yourcompany.gnocchi"
    }
  }
}
```

### Update Supabase Redirect URLs
1. In Supabase, go to **Authentication** > **URL Configuration**
2. Add your app's deep link scheme:
   - `gnocchi://` (or your custom scheme)

## Step 4: Test the Authentication

1. Start your development server:
   ```bash
   npm start
   ```

2. The app should redirect you to the login page if you're not authenticated

3. Click "Continue with Google" to test the OAuth flow

4. After successful authentication, you'll be redirected to the main app

## Troubleshooting

### "Invalid redirect URL" error
- Make sure the redirect URL in Google Cloud Console matches your Supabase callback URL exactly
- Check that you've added the correct scheme in your `app.json`

### Authentication not persisting
- The app uses `expo-secure-store` to persist sessions
- On web, it uses browser localStorage
- Clear app data and try again if you're having issues

### TypeScript errors about JSX
- These are false positives from the language server
- The app will compile and run correctly
- Restart your TypeScript server if needed

## How It Works

1. **AuthProvider** (`contexts/auth-context.tsx`): Manages authentication state globally
2. **Supabase Client** (`lib/supabase.ts`): Configured with secure storage for session persistence
3. **Root Layout** (`app/_layout.tsx`): Protects routes and redirects based on auth state
4. **Login Screen** (`app/(auth)/login.tsx`): Provides Google OAuth login button
5. **Protected Routes**: All routes under `(tabs)` require authentication

## Next Steps

- Add a sign-out button in your app (use `signOut()` from `useAuth()`)
- Customize the login page styling
- Add user profile information display
- Implement additional OAuth providers (GitHub, Apple, etc.)
