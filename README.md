# ReelEarn – Login & Sign-up (React Native / Expo)

Black theme (#000 background, white text, #121212 inputs, #0095F6 buttons). Connected to
`https://nxktxcnbukliaohbxskt.supabase.co` with the publishable anon key (built into `src/config.ts`;
`.env` values `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` override it).

## Run
```
npm install
npx expo start
```
Test on a phone with a development build or Expo Go (SDK 51).

## The 13 steps
| # | Screen | File / route |
|---|---|---|
| 1 | Splash (animated logo + tagline) | `Splash.tsx` |
| 2 | Login: phone, email or username + password | `Login.tsx` |
| 3 | Forgot password: reset link or code to email/phone | `ForgotPassword.tsx` |
| 4 | Google / Facebook quick login (popup sheet) | `Login.tsx` (`SocialSheet`) |
| 5 | Create new account | `SignUpLanding` |
| 6 | Choose phone or email | `ChooseMethod` |
| 7 | Mobile number, country picker (default +91 India, 10 digits) | `EnterContact` |
| 8 | 6-digit code, resend timer (60 s) | `VerifyCode` |
| 9 | Create password | `CreatePassword` |
| 10 | First name + Last name | `BasicInfo` |
| 11 | Date of birth, live age, blocks under 18 | `BirthDate`, `Underage` |
| 12 | Unique username, live availability check | `Username` |
| 13 | Profile photo: gallery or camera (or skip) | `ProfilePhoto` |

Sign-up resumes where the person left off if the app is closed (progress is kept in the Supabase user metadata).

## Connection errors: what was fixed
- Every request goes through a fetch wrapper with a 20 s timeout and up to 3 tries on network failures.
- The URL and key have built-in fallbacks, so a missing `.env` no longer breaks the app.
- An offline banner with Retry checks `/auth/v1/health`; raw errors are mapped to plain messages.
- PKCE flow, session in AsyncStorage, no Supabase calls directly inside `onAuthStateChange`.

## Supabase dashboard setup (required)
1. **Authentication → Providers → Phone**: enable it and choose an SMS provider (**Vonage** or Twilio) with your credentials. Without this, phone codes are never sent.
2. **Authentication → Providers → Email**: enable. In **Email Templates** (Magic Link / Confirm signup) include `{{ .Token }}` so the email carries the 6-digit code. Set OTP length to 6.
3. **Providers → Google and Facebook**: enable with your client IDs/secrets.
4. **Authentication → URL Configuration → Redirect URLs**: add `reelearn://**` (and `exp://**` while testing in Expo Go).
5. Edge Function `login-with-username` (already deployed) lets people log in with a username.
6. Optional: deploy `supabase/functions/reject-underage` (`supabase functions deploy reject-underage`) so an account that fails the 18+ check is deleted instead of just signed out.


## Reels, Wallet, Creator Fund, Withdrawals (signed-in app)
`src/main/Home.tsx` has three tabs: **Reels**, **Wallet**, **Profile**.

- **Reels** (`main/Feed.tsx`): vertical feed from the `posts` table with like and follow (`likes`, `follows`). An ad page appears after every 3rd reel, then every 4th (3, 4, 3, 4 ...); change `AD_GAPS` in `src/ads/config.ts`.
- **Wallet** (`main/Wallet.tsx`): balance, creator-fund progress toward the follower minimum, estimated next credit, monthly payouts, withdrawals with status, wallet history. Data comes from `rpc wallet_summary()` and the `fund_settings` table, so changing a row in `fund_settings` changes the app.
- **Withdraw** (`main/Withdraw.tsx`): UPI or bank transfer, minimum and maximum read from `fund_settings` (default Rs 100 to Rs 5,00,000 per request). Calls `rpc request_withdrawal(...)`. The app never writes to money tables directly.
- Run `supabase/creator_fund.sql` (in the web project folder) once in the Supabase SQL Editor first. Until then the Wallet tab shows a setup message.
- Payouts are a manual review queue: you move a request along with `select public.admin_set_withdrawal('<id>', 'paid', 'UTR 123')` in the SQL Editor. Rejecting refunds the wallet. No payment gateway is connected.

## AdMob
- **Expo Snack / Expo Go:** `src/ads/AdSlot.tsx` shows a labelled placeholder card, because the Google Mobile Ads SDK is native code and cannot run there. The feed logic (ad every 3-4 reels) is identical.
- **Real ads (development build or store build):** copy `src/ads/AdSlot.admob.tsx` over `src/ads/AdSlot.tsx`, run `npx expo install react-native-google-mobile-ads`, add this to `plugins` in `app.json`, then `npx expo run:android` (or an EAS development build):
```json
["react-native-google-mobile-ads", { "androidAppId": "ca-app-pub-3940256099942544~3347511713", "iosAppId": "ca-app-pub-3940256099942544~1458002511" }]
```
- The ids above and in `src/ads/config.ts` are Google's TEST ids. Replace them with your own AdMob app and native ad unit ids before publishing, and never tap your own live ads. Apps shown to users in the EU/UK also need Google's consent form (UMP) before ads load.

## Honest limits
- The age check uses the date the person enters. It is enforced in the app, not by the database, and is not identity verification.
- Not run on a device from the build environment (no npm access); a TypeScript check against stubbed packages found no missing names or props. Expect to fix small things on first run.
- `MainApp` in `App.tsx` is a placeholder. Put your home screen there.
