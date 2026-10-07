import React from 'react';
import { View, Platform, StyleSheet, LogBox } from 'react-native';

LogBox.ignoreLogs(['Response.blob()']);
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { navigationRef } from './services/navigation';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ProfileScreen } from './screens/ProfileScreen';
import { ArtistsScreen } from './screens/ArtistsScreen';
import { AlbumsScreen } from './screens/AlbumsScreen';
import { SongsScreen } from './screens/SongsScreen';
import { PlaylistsScreen } from './screens/PlaylistsScreen';
import { AuthProvider } from './services/AuthContext';
import { AudioProvider } from './services/AudioContext';
import { DialogProvider } from './services/DialogContext';
import { GlobalMiniPlayer } from './components/GlobalMiniPlayer';
import { theme } from './services/theme';

const Tab = createBottomTabNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.surfaceBorder,
    primary: theme.colors.primary,
  },
};

export default function App() {
  return (
    <DialogProvider>
    <AuthProvider>
      <AudioProvider>
        <View style={{ flex: 1 }}>
          <NavigationContainer ref={navigationRef} theme={navigationTheme}>
            <Tab.Navigator
              initialRouteName="Songs"
              screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textMuted,
                tabBarStyle: {
                  backgroundColor: theme.colors.surface,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.surfaceBorder,
                  height: Platform.OS === 'ios' ? 96 : 76,
                  paddingBottom: Platform.OS === 'ios' ? 32 : 14,
                  paddingTop: 10,
                  elevation: 10,
                  shadowColor: '#000',
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                },
                tabBarLabelStyle: {
                  fontSize: 12,
                  fontWeight: '600',
                },
                headerStyle: {
                  backgroundColor: theme.colors.background,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.surfaceBorder,
                  elevation: 0,
                  shadowOpacity: 0,
                },
                headerTintColor: theme.colors.text,
                headerTitleAlign: 'center',
                headerTitleStyle: {
                  fontWeight: '800',
                  fontSize: 19,
                  letterSpacing: 0.4,
                },
              }}
            >
              <Tab.Screen
                name="Playlists"
                component={PlaylistsScreen}
                options={{
                  title: 'Playlist',
                  tabBarIcon: ({ color, size, focused }) => (
                    <Ionicons
                      name={focused ? 'list' : 'list-outline'}
                      size={size}
                      color={color}
                    />
                  ),
                }}
              />
              <Tab.Screen
                name="Songs"
                component={SongsScreen}
                options={{
                  title: 'Canzoni',
                  tabBarIcon: ({ color, size, focused }) => (
                    <Ionicons
                      name={focused ? 'musical-notes' : 'musical-notes-outline'}
                      size={size}
                      color={color}
                    />
                  ),
                }}
              />
              <Tab.Screen
                name="Albums"
                component={AlbumsScreen}
                options={{
                  title: 'Album',
                  tabBarIcon: ({ color, size, focused }) => (
                    <Ionicons
                      name={focused ? 'disc' : 'disc-outline'}
                      size={size}
                      color={color}
                    />
                  ),
                }}
              />
              <Tab.Screen
                name="Artists"
                component={ArtistsScreen}
                options={{
                  title: 'Artisti',
                  tabBarIcon: ({ color, size, focused }) => (
                    <Ionicons
                      name={focused ? 'people' : 'people-outline'}
                      size={size}
                      color={color}
                    />
                  ),
                }}
              />
              <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                  title: 'Account',
                  tabBarIcon: ({ color, size, focused }) => (
                    <Ionicons
                      name={focused ? 'person' : 'person-outline'}
                      size={size}
                      color={color}
                    />
                  ),
                }}
              />
            </Tab.Navigator>
            <GlobalMiniPlayer />
            <StatusBar style="light" />
          </NavigationContainer>
        </View>
      </AudioProvider>
    </AuthProvider>
    </DialogProvider>
  );
}

