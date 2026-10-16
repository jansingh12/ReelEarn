# ReelEarn: Login & Sign-up (React Native / Expo, Supabase Auth + Storage)

Black theme (#000 background, white text, #121212 inputs, #0095F6 buttons). 12-step flow:

| # | Screen | File |
|---|--------|------|
| 1 | Splash | `src/screens/Splash.tsx` |
| 2 | Login (username/email/phone + password) | `src/screens/Login.tsx` |
| 3 | Forgot-password popup (Supabase reset email) | `Login.tsx` → `ForgotSheet` |
| 4 | Social login popup (Facebook, Google) | `Login.tsx` → `SocialSheet` |
| 5 | Create-account landing | `SignUp.tsx` → `SignUpLanding` |
| 6 | Choose method (phone / email) | `ChooseMethod` |
| 7 | Enter mobile number / email → sends OTP | `EnterContact` |
| 8 | 6-digit code → `verifyOtp` (creates the session) | `VerifyCode` |
| 9 | Create password (min 6) | `CreatePassword` |
| 10 | Full name | `FullName` |
| 11 | Username, live availability check | `Username` |
| 12 | Profile photo (pick or Skip) → Storage `avatars/<uid>/avatar.jpg` | `ProfilePhoto` |

Also: `ResetPassword` (shown when the reset link opens the app) and `MainApp` in `App.tsx` (placeholder: put your existing app there).

## Run
```
npm install
npx expo start        # .env already holds your project URL + public anon key
```
Use a development build (`npx expo run:android|ios`) for Facebook/Google and deep links; Expo Go works for email/phone/password.

## One-time Supabase setup
1. SQL: `migration_v24.sql` / `schema.sql` already run (profiles, avatars bucket + policies).
2. Authentication → Providers → **Email**: enable. Authentication → **Email templates → Magic Link / Confirm signup**: the body must contain `{{ .Token }}` so the code is emailed. Set OTP length to **6** (Authentication → Sign In / Providers → Email).
3. **Phone** provider + an SMS provider (Twilio etc.) for mobile-number codes.
4. Authentication → URL Configuration → Redirect URLs: add `reelearn://**` (and the `exp://…` URL shown by Expo while testing).
5. Facebook and Google: enable each provider under Authentication → Providers with your OAuth client id/secret.
6. Username login: `supabase functions deploy login-with-username --no-verify-jwt` (file in `supabase/functions/`).

## How the flow is wired
`AuthContext` listens to `onAuthStateChange`. No session → auth screens. After `verifyOtp` succeeds a session exists, so the navigator moves to steps 9–12 by itself. Progress survives closing the app (`user_metadata.has_password`, `user_metadata.onboarding = 'photo'`, and the `profiles` row). When the photo step ends, `onboarding` is cleared and `MainApp` opens.
