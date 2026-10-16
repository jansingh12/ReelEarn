import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/AuthContext';
import { C } from './src/theme';
import { Btn } from './src/ui';
import Splash from './src/screens/Splash';
import Login from './src/screens/Login';
import { ChooseMethod, CreatePassword, EnterContact, FullName, ProfilePhoto, ResetPassword, SignUpLanding, Username, VerifyCode } from './src/screens/SignUp';

const Auth = createNativeStackNavigator();
const Onb = createNativeStackNavigator();
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, text: C.text, border: C.border, primary: C.blue } };
const opts = { headerShown: false, contentStyle: { backgroundColor: C.bg } } as const;

/** Replace this with your existing app (feed, reels, wallet…). It renders once sign-up/login is complete. */
function MainApp() {
  const { profile, signOut } = useAuth();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: C.text, fontSize: 22, fontWeight: '700', marginBottom: 6 }}>Welcome, @{profile?.username}</Text>
      <Text style={{ color: C.mute, marginBottom: 24 }}>Plug your ReelEarn home screen in here.</Text>
      <Btn title="Log out" variant="outline" onPress={signOut} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

function Root() {
  const { session, user, profile, loading, recovery } = useAuth();
  const [minSplash, setMin] = useState(true);
  useEffect(() => { const t = setTimeout(() => setMin(false), 1400); return () => clearTimeout(t); }, []);

  if (loading || minSplash) return <Splash />;                                   // 1. Splash
  if (recovery) return <ResetPassword />;
  if (!session) {
    return (                                                                      // 2–8
      <Auth.Navigator screenOptions={opts} initialRouteName="Login">
        <Auth.Screen name="Login" component={Login} />
        <Auth.Screen name="SignUpLanding" component={SignUpLanding} />
        <Auth.Screen name="ChooseMethod" component={ChooseMethod} />
        <Auth.Screen name="EnterContact" component={EnterContact} />
        <Auth.Screen name="VerifyCode" component={VerifyCode} />
      </Auth.Navigator>
    );
  }
  const meta = (user?.user_metadata ?? {}) as { onboarding?: string | null; has_password?: boolean };
  const done = !!profile?.username && meta.onboarding !== 'photo';
  if (done) return <MainApp />;
  const initial = meta.onboarding === 'photo' || profile?.username ? 'ProfilePhoto' : meta.has_password ? 'FullName' : 'CreatePassword';
  return (                                                                        // 9–12, resumes where the person left off
    <Onb.Navigator screenOptions={opts} initialRouteName={initial}>
      <Onb.Screen name="CreatePassword" component={CreatePassword} />
      <Onb.Screen name="FullName" component={FullName} />
      <Onb.Screen name="Username" component={Username} />
      <Onb.Screen name="ProfilePhoto" component={ProfilePhoto} />
    </Onb.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider><NavigationContainer theme={theme}><Root /></NavigationContainer></AuthProvider>
    </SafeAreaProvider>
  );
}
