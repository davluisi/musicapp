import axios from 'axios';

const API_BASE_URL = 'http://192.168.1.180:8080/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Artist {
  id: number;
  nome: string;
  cognome: string;
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
  urlFileAudio: string;
  anno?: number;
  urlImmagine?: string;
  album?: Album;
  artisti: Artist[];
}

export const artistApi = {
  getAll: async (): Promise<Artist[]> => {
    const response = await api.get('/artisti');
    return response.data.data;
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
    return response.data.data;
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
    return response.data.data;
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

export const uploadApi = {
  uploadImage: async (type: string, file: any): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/upload/image/${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },
  
  downloadFromYouTube: async (url: string): Promise<string> => {
    console.log('Starting YouTube download for URL:', url);
    try {
      const response = await api.post('/upload/youtube', { url });
      console.log('YouTube download response:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('YouTube download error:', error);
      throw error;
    }
  },
};
