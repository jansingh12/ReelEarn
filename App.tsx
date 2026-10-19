import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/AuthContext';
import { C } from './src/theme';
import MainApp from './src/main/Home';
import Splash from './src/screens/Splash';
import Login from './src/screens/Login';
import ForgotPassword from './src/screens/ForgotPassword';
import { BasicInfo, BirthDate, ChooseMethod, CreatePassword, EnterContact, ProfilePhoto, ResetPassword, SignUpLanding, Underage, Username, VerifyCode } from './src/screens/SignUp';

const Auth = createNativeStackNavigator();
const Onb = createNativeStackNavigator();
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, text: C.text, border: C.border, primary: C.blue } };
const opts = { headerShown: false, contentStyle: { backgroundColor: C.bg } } as const;

function Root() {
  const { session, user, profile, loading, recovery, blocked } = useAuth();
  const [minSplash, setMin] = useState(true);
  useEffect(() => { const t = setTimeout(() => setMin(false), 1800); return () => clearTimeout(t); }, []);

  if (loading || minSplash) return <Splash />;                                    // Step 1
  if (blocked) return <Underage />;                                               // Step 11: under 18
  if (recovery) return <ResetPassword />;                                         // after Step 3
  const meta = (user?.user_metadata ?? {}) as { onboarding?: string | null; has_password?: boolean; first_name?: string; dob?: string; underage?: boolean };
  if (session && meta.underage) return <Underage />;
  if (!session) {
    return (                                                                      // Steps 2 to 8
      <Auth.Navigator screenOptions={opts} initialRouteName="Login">
        <Auth.Screen name="Login" component={Login} />
        <Auth.Screen name="ForgotPassword" component={ForgotPassword} />
        <Auth.Screen name="SignUpLanding" component={SignUpLanding} />
        <Auth.Screen name="ChooseMethod" component={ChooseMethod} />
        <Auth.Screen name="EnterContact" component={EnterContact} />
        <Auth.Screen name="VerifyCode" component={VerifyCode} />
      </Auth.Navigator>
    );
  }
  const done = !!profile?.username && meta.onboarding !== 'photo';
  if (done) return <MainApp />;
  const initial = meta.onboarding === 'photo' || profile?.username ? 'ProfilePhoto'
    : !meta.has_password ? 'CreatePassword' : !meta.first_name ? 'BasicInfo' : !meta.dob ? 'BirthDate' : 'Username';
  return (                                                                        // Steps 9 to 13, resumes where the person left off
    <Onb.Navigator screenOptions={opts} initialRouteName={initial}>
      <Onb.Screen name="CreatePassword" component={CreatePassword} />
      <Onb.Screen name="BasicInfo" component={BasicInfo} />
      <Onb.Screen name="BirthDate" component={BirthDate} />
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
