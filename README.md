# Takoma HD Mobile

Expo Router mobile app for browsing active news from the Firebase client database.

## Firebase configuration

Copy `.env.example` to `.env` and provide the Firebase **client** configuration values:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

These `EXPO_PUBLIC_` values are bundled into the app. Never put Firebase Admin credentials or service account keys here.

The reader subscribes to the `news` and `categories` Firestore collections. News documents should have `title`, `date`, `categoryId`, `type`, `image`, `description`, `descriptionText`, and `status` fields. Only active news is shown. Saved story IDs and display preferences are stored on the device.

## Screens

- Home: latest active stories, search, featured/breaking filters
- Category: browse stories by category
- Play: video placeholder until a video collection/source is defined
- Saved: stories bookmarked on this device

English and Amharic are available from the preferences control, along with system, light, and dark appearance modes.

## AdMob and EAS builds

The app reads runtime ad unit IDs and placement switches from the web app's `ads/config` Firestore document. Enable ads and add the banner, interstitial, native, and app-open unit IDs there.

AdMob application IDs must be embedded in each native binary at build time, so they cannot be fetched from Firebase after install. Set `ADMOB_ANDROID_APP_ID` and, when building iOS, `ADMOB_IOS_APP_ID` as EAS environment variables before creating preview or production builds. The example values in `app.config.js` are Google's test app IDs; replace them with the app IDs from AdMob for store builds. Changes to these IDs require a new native build.
