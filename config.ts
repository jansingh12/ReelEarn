import { Platform } from 'react-native';
/** Google's official TEST ad unit IDs. They always fill and are safe to click.
 *  Before publishing, replace them with your own units from the AdMob console (and the app IDs in app.json). */
export const AD_UNITS = {
  nativeAdvanced: Platform.select({ ios: 'ca-app-pub-3940256099942544/3986624511', default: 'ca-app-pub-3940256099942544/2247696110' })!,
};
/** An ad appears after every 3rd reel, then after the next 4th, then 3rd again… (3, 4, 3, 4). */
export const AD_GAPS = [3, 4];
