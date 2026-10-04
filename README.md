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
