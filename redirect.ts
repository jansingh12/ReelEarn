import * as Linking from 'expo-linking';
export const makeRedirect = (path: string) => Linking.createURL(path); // reelearn://path in a build, exp://… in Expo Go
