import axios from 'axios';
import { Platform } from 'react-native';

// In Expo/React Native: su Android emulator usa 10.0.2.2, su iOS/Web usa localhost, oppure usa l'IP LAN configurato
export const DEFAULT_API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8080/api/v1',
  ios: 'http://localhost:8080/api/v1',
  default: 'http://localhost:8080/api/v1',
});

// Possiamo memorizzare e configurare la baseURL dinamicamente
let currentBaseUrl = 'http://192.168.1.180:8080/api/v1';

export const api = axios.create({
  baseURL: currentBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export const setApiBaseUrl = (newUrl: string) => {
  currentBaseUrl = newUrl;
  api.defaults.baseURL = newUrl;
};

export const getApiBaseUrl = () => currentBaseUrl;

// Se l'URL punta ad AWS S3, lo instrada tramite l'endpoint /upload/stream del nostro backend
export const getMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.includes('.amazonaws.com/')) {
    const key = url.split('.amazonaws.com/')[1];
    return `${currentBaseUrl}/upload/stream?key=${encodeURIComponent(key)}`;
  }
  return url;
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

  downloadFromYouTube: async (url: string): Promise<YouTubeExtractResult> => {
    const response = await api.post('/upload/youtube', { url });
    return response.data.data;
  },
};
