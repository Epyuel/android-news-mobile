module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    package: 'com.haileyesus.danahd',
  },
  plugins: (config.plugins ?? []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads') {
      return [plugin[0], {
        ...plugin[1],
        androidSdk: 'classic',
        androidAppId: process.env.ADMOB_ANDROID_APP_ID || plugin[1]?.androidAppId || 'ca-app-pub-3940256099942544~3347511713',
        iosAppId: process.env.ADMOB_IOS_APP_ID || plugin[1]?.iosAppId || 'ca-app-pub-3940256099942544~1458002511',
      }];
    }
    return plugin;
  }),
});
