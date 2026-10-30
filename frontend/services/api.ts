import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const PROD_API_BASE_URL = 'https://music.davideluisi.com/api/v1';

// In sviluppo (Expo Go), rileva automaticamente l'IP LAN del PC dal bundler Metro
const getDevLanBaseUrl = (): string => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8080/api/v1`;
    }
  }
  return Platform.select({
    android: 'http://10.0.2.2:8080/api/v1',
    ios: 'http://localhost:8080/api/v1',
    default: 'http://localhost:8080/api/v1',
  }) as string;
};

export const DEFAULT_API_BASE_URL = getDevLanBaseUrl();

// Di default punta a produzione, ma in modalità sviluppo (__DEV__) verifica subito se il backend locale sul PC è acceso
let currentBaseUrl = PROD_API_BASE_URL;

export const api = axios.create({
  baseURL: currentBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minuti per permettere download e upload audio
});

export const setApiBaseUrl = (newUrl: string) => {
  currentBaseUrl = newUrl;
  api.defaults.baseURL = newUrl;
};

export const getApiBaseUrl = () => currentBaseUrl;

// Se siamo in sviluppo (__DEV__), controlla se il backend locale (run_be.bat) risponde sulla rete locale e lo usa automaticamente
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  const localUrl = getDevLanBaseUrl();
  axios
    .get(`${localUrl}/app/version`, { timeout: 2000 })
    .then(() => {
      console.log(`🔌 Backend locale rilevato! Connesso a: ${localUrl}`);
      setApiBaseUrl(localUrl);
    })
    .catch(() => {
      console.log(`☁️ Backend locale non attivo, uso backend VPS: ${PROD_API_BASE_URL}`);
    });
}

// Se l'URL punta ad AWS S3, lo instrada tramite l'endpoint /upload/stream del nostro backend
export const getMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.includes('.amazonaws.com/')) {
    const key = url.split('.amazonaws.com/')[1];
    return `${currentBaseUrl}/upload/stream?key=${encodeURIComponent(key)}`;
  }
  return url;
};

// Restituisce l'URL della copertina di una canzone dando priorità a quella dell'album associato (per evitare duplicati su S3)
export const getSongCoverUrl = (song?: Song | null): string => {
  if (!song) return '';
  const coverUrl = song.album?.urlImmagine || song.urlImmagine;
  return getMediaUrl(coverUrl);
};

export interface Artist {
  id: number;
  nome: string;
  urlImmagine?: string;
}

export interface Album {
  id: number;
  nome: string;
  anno?: number;
  urlImmagine?: string;
  artisti: Artist[];
}

export interface Song {
  id: number;
  nome?: string;
  urlFileAudio: string;
  anno?: number;
  urlImmagine?: string;
  album?: Album;
  artisti: Artist[];
}

export interface AppVersionInfo {
  version: string;
  apkUrl: string;
  releaseNotes?: string;
  mandatory?: boolean;
}

export interface User {
  id: number;
  nome: string;
  cognome: string;
  email: string;
  urlImmagineProfilo?: string;
  createdAt?: string;
}

export interface Playlist {
  id: number;
  nome: string;
  urlImmagine?: string;
  utenteId: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterDTO {
  nome: string;
  cognome: string;
  email: string;
  password: string;
  urlImmagineProfilo?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export const authApi = {
  register: async (data: RegisterDTO): Promise<User> => {
    const response = await api.post('/auth/register', data);
    return response.data.data;
  },
  login: async (data: LoginDTO): Promise<User> => {
    const response = await api.post('/auth/login', data);
    return response.data.data;
  },
  getProfile: async (id: number): Promise<User> => {
    const response = await api.get(`/auth/profile/${id}`);
    return response.data.data;
  },
  updateProfile: async (id: number, data: Partial<User>): Promise<User> => {
    const response = await api.put(`/auth/profile/${id}`, data);
    return response.data.data;
  },
};

export const artistApi = {
  getAll: async (): Promise<Artist[]> => {
    const response = await api.get('/artisti');
    return response.data.data || [];
  },
  create: async (artist: Omit<Artist, 'id'>): Promise<Artist> => {
    const response = await api.post('/artisti', artist);
    return response.data.data;
  },
  update: async (id: number, artist: Partial<Artist>): Promise<Artist> => {
    const response = await api.put(`/artisti/${id}`, artist);
    return response.data.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/artisti/${id}`);
  },
};

export const albumApi = {
  getAll: async (): Promise<Album[]> => {
    const response = await api.get('/album');
    return response.data.data || [];
  },
  create: async (album: Omit<Album, 'id'>): Promise<Album> => {
    const response = await api.post('/album', album);
    return response.data.data;
  },
  update: async (id: number, album: Partial<Album>): Promise<Album> => {
    const response = await api.put(`/album/${id}`, album);
    return response.data.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/album/${id}`);
  },
};

export const songApi = {
  getAll: async (): Promise<Song[]> => {
    const response = await api.get('/canzoni');
    return response.data.data || [];
  },
  create: async (song: Omit<Song, 'id'>): Promise<Song> => {
    const response = await api.post('/canzoni', song);
    return response.data.data;
  },
  update: async (id: number, song: Partial<Song>): Promise<Song> => {
    const response = await api.put(`/canzoni/${id}`, song);
    return response.data.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/canzoni/${id}`);
  },
};

export const playlistApi = {
  getByUtente: async (utenteId: number): Promise<Playlist[]> => {
    const response = await api.get('/playlists', { params: { utenteId } });
    return response.data.data || [];
  },
  getCanzoni: async (playlistId: number): Promise<Song[]> => {
    const response = await api.get(`/playlists/${playlistId}/canzoni`);
    return response.data.data || [];
  },
  create: async (playlist: { nome: string; urlImmagine?: string; utenteId: number }): Promise<Playlist> => {
    const response = await api.post('/playlists', playlist);
    return response.data.data;
  },
  update: async (id: number, playlist: Partial<Playlist>): Promise<Playlist> => {
    const response = await api.put(`/playlists/${id}`, playlist);
    return response.data.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/playlists/${id}`);
  },
  getPlaylistIdsForCanzone: async (canzoneId: number, utenteId: number): Promise<number[]> => {
    const response = await api.get(`/playlists/canzone/${canzoneId}`, { params: { utenteId } });
    return response.data.data || [];
  },
  syncCanzonePlaylists: async (canzoneId: number, utenteId: number, playlistIds: number[]): Promise<void> => {
    await api.post(`/playlists/canzone/${canzoneId}/sync`, playlistIds, { params: { utenteId } });
  },
};

export interface YouTubeExtractResult {
  audioUrl: string;
  imageUrl?: string;
  title?: string;
  year?: number;
  artist?: string;
  album?: string;
}

export const uploadApi = {
  uploadImage: async (type: string, file: any): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/upload/image/${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      transformRequest: (data) => data, // previene che axios modifichi FormData su React Native
    });
    return response.data.data;
  },

  uploadAudio: async (file: any): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload/audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      transformRequest: (data) => data,
    });
    return response.data.data;
  },

  downloadFromYouTube: async (url: string): Promise<YouTubeExtractResult> => {
    const response = await api.post('/upload/youtube', { url });
    return response.data.data;
  },
};

export const appService = {
  getLatestVersion: async (): Promise<AppVersionInfo> => {
    const response = await api.get('/app/version');
    return response.data.data;
  },
  getDownloadUrl: (apkUrl: string): string => {
    if (apkUrl.startsWith('http://') || apkUrl.startsWith('https://')) {
      return apkUrl;
    }
    return `${currentBaseUrl}${apkUrl.startsWith('/') ? '' : '/'}${apkUrl}`;
  },
};
