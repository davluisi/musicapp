import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { createAudioPlayer, AudioPlayer, setAudioModeAsync, AudioStatus } from 'expo-audio';
import { Song, getMediaUrl, songApi, playlistApi } from './api';

export interface AudioContextType {
  activeSong: Song | null;
  isPlaying: boolean;
  playbackPosition: number;
  playbackDuration: number;
  detailModalVisible: boolean;
  songOptionsMenuVisible: boolean;
  playlistPickerVisible: boolean;
  songForOptions: Song | null;
  selectedPlaylists: number[];
  setSelectedPlaylists: React.Dispatch<React.SetStateAction<number[]>>;
  togglePlaySong: (song: Song, autoStart?: boolean) => Promise<void>;
  handleMiniPlayerToggle: () => void;
  openSongDetail: (song?: Song) => void;
  closeSongDetail: () => void;
  openSongOptions: (song: Song) => void;
  closeSongOptions: () => void;
  openPlaylistPickerForSong: (song: Song, userId?: number) => Promise<void>;
  closePlaylistPicker: () => void;
  handleSavePlaylistsForSong: (userId: number) => Promise<void>;
  handleSeek: (ratio: number) => void;
  restartSong: () => void;
  nextSong: () => void;
  playQueue: (songsList: Song[], startIndex?: number) => Promise<void>;
  queue: Song[];
  stopAndClearPlayer: () => void;
  formatTime: (seconds: number) => string;
  getSongTitle: (song: Song) => string;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackPosition, setPlaybackPosition] = useState<number>(0);
  const [playbackDuration, setPlaybackDuration] = useState<number>(0);
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [songOptionsMenuVisible, setSongOptionsMenuVisible] = useState<boolean>(false);
  const [songForOptions, setSongForOptions] = useState<Song | null>(null);
  const [playlistPickerVisible, setPlaylistPickerVisible] = useState<boolean>(false);
  const [selectedPlaylists, setSelectedPlaylists] = useState<number[]>([]);

  // Queue state
  const [queue, setQueue] = useState<Song[]>([]);
  const queueRef = useRef<Song[]>([]);
  const currentIndexRef = useRef<number>(-1);

  const playerRef = useRef<AudioPlayer | null>(null);
  const listenerSubRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: true,
      allowsRecording: false,
    }).catch(err => console.warn('Error setting audio mode:', err));

    return () => {
      if (listenerSubRef.current) {
        listenerSubRef.current.remove();
        listenerSubRef.current = null;
      }
      if (playerRef.current) {
        try {
          playerRef.current.remove();
        } catch (e) {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, []);

  const getSongTitle = (song: Song) => {
    if (song.nome && song.nome.trim()) return song.nome;
    if (!song.urlFileAudio) return 'Traccia Audio';
    const parts = song.urlFileAudio.split('/');
    const last = parts[parts.length - 1];
    return decodeURIComponent(last.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const stopAndClearPlayer = () => {
    if (listenerSubRef.current) {
      listenerSubRef.current.remove();
      listenerSubRef.current = null;
    }
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        playerRef.current.remove();
      } catch (e) {
        console.warn('Error clearing audio player:', e);
      }
      playerRef.current = null;
    }
    queueRef.current = [];
    currentIndexRef.current = -1;
    setQueue([]);
    setActiveSong(null);
    setIsPlaying(false);
    setPlaybackPosition(0);
    setPlaybackDuration(0);
  };

  const playSongInternal = async (song: Song, autoStart = true): Promise<void> => {
    if (!song.urlFileAudio) {
      Alert.alert('File Audio Mancante', 'Questa canzone non ha un file audio collegato');
      return;
    }

    const currentPlayer = playerRef.current;
    if (listenerSubRef.current) {
      listenerSubRef.current.remove();
      listenerSubRef.current = null;
    }
    if (currentPlayer) {
      try {
        currentPlayer.pause();
        currentPlayer.remove();
      } catch (e) {
        console.warn('Error releasing previous player:', e);
      }
      playerRef.current = null;
    }

    setActiveSong(song);
    setIsPlaying(autoStart);
    setPlaybackPosition(0);
    setPlaybackDuration(0);

    const audioStreamUrl = getMediaUrl(song.urlFileAudio);
    const newPlayer = createAudioPlayer(audioStreamUrl, {
      downloadFirst: false,
    });
    playerRef.current = newPlayer;

    const sub = newPlayer.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (status.error) {
        console.error('Audio playback error in status:', status.error);
        Alert.alert('Errore Audio', 'Errore durante la riproduzione: ' + status.error);
        setIsPlaying(false);
        return;
      }
      if (status.didJustFinish) {
        // Brano finito: avanza automaticamente al prossimo nella coda se presente
        const nextIndex = currentIndexRef.current + 1;
        if (queueRef.current.length > 0 && nextIndex < queueRef.current.length) {
          currentIndexRef.current = nextIndex;
          const nextTrack = queueRef.current[nextIndex];
          playSongInternal(nextTrack, true);
        } else {
          // Fine della coda o riproduzione singola terminata
          setIsPlaying(false);
          setPlaybackPosition(0);
        }
        return;
      }

      if (status.isLoaded) {
        setIsPlaying(status.playing);
        if (status.currentTime != null) {
          setPlaybackPosition(status.currentTime);
        }
        if (status.duration != null && status.duration > 0) {
          setPlaybackDuration(status.duration);
        }
      }
    });
    listenerSubRef.current = sub;

    if (autoStart) {
      newPlayer.play();
    }
  };

  const togglePlaySong = async (song: Song, autoStart = true) => {
    if (!song.urlFileAudio) {
      Alert.alert('File Audio Mancante', 'Questa canzone non ha un file audio collegato');
      return;
    }

    const currentPlayer = playerRef.current;

    // Se è la stessa canzone attiva: commuta play/pausa
    if (activeSong?.id === song.id && currentPlayer) {
      if (isPlaying) {
        currentPlayer.pause();
        setIsPlaying(false);
      } else {
        currentPlayer.play();
        setIsPlaying(true);
      }
      return;
    }

    // Nuova traccia singola (non in una coda di album):
    queueRef.current = [song];
    currentIndexRef.current = 0;
    setQueue([song]);

    try {
      await playSongInternal(song, autoStart);
    } catch (err) {
      console.error('Error loading or playing song:', err);
      Alert.alert('Errore Riproduzione', 'Impossibile riprodurre il file audio.');
      setIsPlaying(false);
    }
  };

  const playQueue = async (songsList: Song[], startIndex = 0) => {
    if (!songsList || songsList.length === 0) {
      Alert.alert('Nessun brano', 'Questo album non contiene brani da riprodurre');
      return;
    }

    const safeIndex = Math.max(0, Math.min(songsList.length - 1, startIndex));
    queueRef.current = songsList;
    currentIndexRef.current = safeIndex;
    setQueue(songsList);

    const initialSong = songsList[safeIndex];
    try {
      await playSongInternal(initialSong, true);
    } catch (err) {
      console.error('Error starting queue playback:', err);
      Alert.alert('Errore Riproduzione', 'Impossibile riprodurre i brani.');
    }
  };

  const handleMiniPlayerToggle = () => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer) {
      if (activeSong) {
        togglePlaySong(activeSong, true);
      }
      return;
    }

    if (isPlaying) {
      currentPlayer.pause();
      setIsPlaying(false);
    } else {
      currentPlayer.play();
      setIsPlaying(true);
    }
  };

  const openSongDetail = (song?: Song) => {
    if (song) {
      setActiveSong(song);
    }
    setDetailModalVisible(true);
  };

  const closeSongDetail = () => {
    setDetailModalVisible(false);
  };

  const openSongOptions = (song: Song) => {
    setSongForOptions(song);
    setSongOptionsMenuVisible(true);
  };

  const closeSongOptions = () => {
    setSongOptionsMenuVisible(false);
  };

  const openPlaylistPickerForSong = async (song: Song, userId?: number) => {
    if (!userId) {
      Alert.alert('Accesso Richiesto', 'Devi aver effettuato l\'accesso per gestire le playlist.');
      return;
    }
    setSongForOptions(song);
    try {
      const playlistIds = await playlistApi.getPlaylistIdsForCanzone(song.id, userId);
      setSelectedPlaylists(playlistIds);
      setPlaylistPickerVisible(true);
    } catch (err) {
      console.error('Error fetching playlist ids for song', err);
      Alert.alert('Errore', 'Impossibile caricare le playlist.');
    }
  };

  const closePlaylistPicker = () => {
    setPlaylistPickerVisible(false);
  };

  const handleSavePlaylistsForSong = async (userId: number) => {
    if (!songForOptions || !userId) return;
    try {
      await playlistApi.syncCanzonePlaylists(songForOptions.id, userId, selectedPlaylists);
      setPlaylistPickerVisible(false);
      Alert.alert('Successo', 'Playlist aggiornate con successo!');
    } catch (err) {
      console.error('Error syncing playlists:', err);
      Alert.alert('Errore', 'Impossibile aggiornare le playlist');
    }
  };

  const handleSeek = (ratio: number) => {
    const currentPlayer = playerRef.current;
    if (currentPlayer && playbackDuration > 0) {
      const targetTime = Math.max(0, Math.min(playbackDuration, ratio * playbackDuration));
      try {
        if (typeof (currentPlayer as any).seekTo === 'function') {
          (currentPlayer as any).seekTo(targetTime);
          setPlaybackPosition(targetTime);
        }
      } catch (e) {
        console.warn('Seek error:', e);
      }
    }
  };

  const restartSong = () => {
    const currentPlayer = playerRef.current;
    if (currentPlayer) {
      try {
        if (typeof (currentPlayer as any).seekTo === 'function') {
          (currentPlayer as any).seekTo(0);
          setPlaybackPosition(0);
          if (!isPlaying) {
            currentPlayer.play();
            setIsPlaying(true);
          }
          return;
        }
      } catch (e) {
        console.warn('restartSong seekTo error:', e);
      }
    }
    // Fallback: se il player non supporta seekTo o non è pronto, ricarica la canzone attiva
    if (activeSong) {
      togglePlaySong(activeSong, true);
    }
  };

  const nextSong = () => {
    const nextIndex = currentIndexRef.current + 1;
    if (queueRef.current.length > 0 && nextIndex < queueRef.current.length) {
      currentIndexRef.current = nextIndex;
      const nextTrack = queueRef.current[nextIndex];
      playSongInternal(nextTrack, true);
    } else {
      stopAndClearPlayer();
    }
  };

  return (
    <AudioContext.Provider
      value={{
        activeSong,
        isPlaying,
        playbackPosition,
        playbackDuration,
        detailModalVisible,
        songOptionsMenuVisible,
        playlistPickerVisible,
        songForOptions,
        selectedPlaylists,
        setSelectedPlaylists,
        togglePlaySong,
        handleMiniPlayerToggle,
        openSongDetail,
        closeSongDetail,
        openSongOptions,
        closeSongOptions,
        openPlaylistPickerForSong,
        closePlaylistPicker,
        handleSavePlaylistsForSong,
        handleSeek,
        restartSong,
        nextSong,
        playQueue,
        queue,
        stopAndClearPlayer,
        formatTime,
        getSongTitle,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
