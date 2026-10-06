import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ProfileScreen } from './screens/ProfileScreen';
import { ArtistsScreen } from './screens/ArtistsScreen';
import { AlbumsScreen } from './screens/AlbumsScreen';
import { SongsScreen } from './screens/SongsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#1DB954',
          tabBarInactiveTintColor: '#888',
          tabBarStyle: {
            backgroundColor: '#121212',
            borderTopWidth: 1,
            borderTopColor: '#282828',
          },
          headerStyle: {
            backgroundColor: '#121212',
          },
          headerTintColor: '#fff',
        }}
      >
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'Profilo' }}
        />
        <Tab.Screen
          name="Artists"
          component={ArtistsScreen}
          options={{ title: 'Artisti' }}
        />
        <Tab.Screen
          name="Albums"
          component={AlbumsScreen}
          options={{ title: 'Album' }}
        />
        <Tab.Screen
          name="Songs"
          component={SongsScreen}
          options={{ title: 'Canzoni' }}
        />
      </Tab.Navigator>
      <StatusBar style="dark" />
    </NavigationContainer>
  );
}
