import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { showDialog } from './DialogContext';
import { createAudioPlayer, AudioPlayer, setAudioModeAsync, AudioStatus, AudioMetadata } from 'expo-audio';
import { Song, getMediaUrl, getSongCoverUrl, songApi, playlistApi } from './api';

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
  startShufflePlayback: (songsList: Song[]) => Promise<void>;
  playSongOnly: (song: Song) => Promise<void>;
  playSongAndOpen: (song: Song) => Promise<void>;
  enqueueSongNext: (song: Song) => void;
  enqueueSongLast: (song: Song) => void;
  songPendingEdit: Song | null;
  requestEditSong: (song: Song) => void;
  clearPendingEdit: () => void;
  libraryVersion: number;
  notifyLibraryChanged: () => void;
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
  const [songPendingEdit, setSongPendingEdit] = useState<Song | null>(null);
  const [libraryVersion, setLibraryVersion] = useState(0);

  // Queue state
  const [queue, setQueue] = useState<Song[]>([]);
  const queueRef = useRef<Song[]>([]);
  const currentIndexRef = useRef<number>(-1);
  const shufflePoolRef = useRef<Song[]>([]);

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

  const buildSongMetadata = (song: Song): AudioMetadata => {
    const title = getSongTitle(song);
    const artist = song.artisti && song.artisti.length > 0
      ? song.artisti.map(a => a.nome).join(', ')
      : undefined;
    const albumTitle = song.album?.nome || undefined;
    const artworkUrl = getSongCoverUrl(song) || undefined;

    return {
      title,
      artist,
      albumTitle,
      artworkUrl,
    };
  };

  const stopAndClearPlayer = () => {
    if (listenerSubRef.current) {
      listenerSubRef.current.remove();
      listenerSubRef.current = null;
    }
    if (playerRef.current) {
      try {
        if (typeof (playerRef.current as any).clearLockScreenControls === 'function') {
          (playerRef.current as any).clearLockScreenControls();
        }
        playerRef.current.pause();
        playerRef.current.remove();
      } catch (e) {
        console.warn('Error clearing audio player:', e);
      }
      playerRef.current = null;
    }
    queueRef.current = [];
    currentIndexRef.current = -1;
    shufflePoolRef.current = [];
    setQueue([]);
    setActiveSong(null);
    setIsPlaying(false);
    setPlaybackPosition(0);
    setPlaybackDuration(0);
  };

  const playSongInternal = async (song: Song, autoStart = true): Promise<void> => {
    if (!song.urlFileAudio) {
      showDialog('File Audio Mancante', 'Questa canzone non ha un file audio collegato');
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
    console.log('🎵 Tentativo riproduzione audioStreamUrl:', audioStreamUrl);
    const newPlayer = createAudioPlayer(audioStreamUrl, {
      downloadFirst: false,
    });
    playerRef.current = newPlayer;

    const sub = newPlayer.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (status.error) {
        console.error('Audio playback error in status:', status.error, 'per URL:', audioStreamUrl);
        showDialog('Errore Audio', 'Impossibile riprodurre: ' + status.error + '\nURL: ' + audioStreamUrl);
        setIsPlaying(false);
        return;
      }
      if (status.didJustFinish) {
        if (shufflePoolRef.current.length > 0) {
          const pool = shufflePoolRef.current.filter(track => !!track.urlFileAudio);
          const others = pool.filter(track => track.id !== song.id);
          const choices = others.length > 0 ? others : pool;
          const nextTrack = choices[Math.floor(Math.random() * choices.length)];
          if (nextTrack) {
            playSongInternal(nextTrack, true);
            return;
          }
        }
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

    // Attiva i controlli permanenti nella tendina notifiche e a schermo bloccato (stile Spotify)
    try {
      if (typeof (newPlayer as any).setActiveForLockScreen === 'function') {
        const metadata = buildSongMetadata(song);
        (newPlayer as any).setActiveForLockScreen(true, metadata, {
          showSeekForward: false,
          showSeekBackward: false,
          showNextTrack: true,
          showPreviousTrack: true,
        });
      }
    } catch (e) {
      console.warn('Impossibile attivare controlli di riproduzione permanente / lock screen:', e);
    }

    if (autoStart) {
      newPlayer.play();
    }
  };

  const togglePlaySong = async (song: Song, autoStart = true) => {
    if (!song.urlFileAudio) {
      showDialog('File Audio Mancante', 'Questa canzone non ha un file audio collegato');
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

    // Nuova traccia singola: esce dalla riproduzione casuale
    shufflePoolRef.current = [];
    queueRef.current = [song];
    currentIndexRef.current = 0;
    setQueue([song]);

    try {
      await playSongInternal(song, autoStart);
    } catch (err) {
      console.error('Error loading or playing song:', err);
      showDialog('Errore Riproduzione', 'Impossibile riprodurre il file audio.');
      setIsPlaying(false);
    }
  };

  const playQueue = async (songsList: Song[], startIndex = 0) => {
    if (!songsList || songsList.length === 0) {
      showDialog('Nessun brano', 'Questo album non contiene brani da riprodurre');
      return;
    }

    const safeIndex = Math.max(0, Math.min(songsList.length - 1, startIndex));
    shufflePoolRef.current = [];
    queueRef.current = songsList;
    currentIndexRef.current = safeIndex;
    setQueue(songsList);

    const initialSong = songsList[safeIndex];
    try {
      await playSongInternal(initialSong, true);
    } catch (err) {
      console.error('Error starting queue playback:', err);
      showDialog('Errore Riproduzione', 'Impossibile riprodurre i brani.');
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
      showDialog('Accesso Richiesto', 'Devi aver effettuato l\'accesso per gestire le playlist.');
      return;
    }
    setSongForOptions(song);
    try {
      const playlistIds = await playlistApi.getPlaylistIdsForCanzone(song.id, userId);
      setSelectedPlaylists(playlistIds);
      setPlaylistPickerVisible(true);
    } catch (err) {
      console.error('Error fetching playlist ids for song', err);
      showDialog('Errore', 'Impossibile caricare le playlist.');
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
      showDialog('Successo', 'Playlist aggiornate con successo!');
    } catch (err) {
      console.error('Error syncing playlists:', err);
      showDialog('Errore', 'Impossibile aggiornare le playlist');
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

  const playSongOnly = async (song: Song) => {
    if (!song.urlFileAudio) {
      showDialog('File Audio Mancante', 'Questa canzone non ha un file audio collegato');
      return;
    }

    if (activeSong?.id === song.id && playerRef.current) {
      if (!isPlaying) {
        playerRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    const waitingWithoutPlayer = !activeSong && currentIndexRef.current < 0
      ? [...queueRef.current]
      : null;

    await togglePlaySong(song, true);

    if (waitingWithoutPlayer && waitingWithoutPlayer.length > 0) {
      const pending = [...waitingWithoutPlayer];
      const existing = pending.findIndex((item) => item.id === song.id);
      if (existing >= 0) {
        pending.splice(existing, 1);
      }
      const nextQueue = [song, ...pending];
      queueRef.current = nextQueue;
      currentIndexRef.current = 0;
      setQueue(nextQueue);
    }
  };

  const playSongAndOpen = async (song: Song) => {
    if (!song.urlFileAudio) {
      showDialog('File Audio Mancante', 'Questa canzone non ha un file audio collegato');
      return;
    }
    await playSongOnly(song);
    openSongDetail(song);
  };

  const rememberQueue = (list: Song[], index: number) => {
    queueRef.current = list;
    currentIndexRef.current = index;
    setQueue(list);
  };

  const enqueueSong = (song: Song, where: 'next' | 'last') => {
    if (!song.urlFileAudio) {
      showDialog('File Audio Mancante', 'Questa canzone non ha un file audio collegato');
      return;
    }

    const title = getSongTitle(song);
    shufflePoolRef.current = [];
    let list = [...queueRef.current];
    let index = currentIndexRef.current;

    if (activeSong) {
      if (index < 0 || index >= list.length || list[index]?.id !== activeSong.id) {
        const found = list.findIndex((item) => item.id === activeSong.id);
        if (found >= 0) {
          index = found;
        } else {
          list = [activeSong, ...list];
          index = 0;
        }
      }

      if (where === 'last') {
        rememberQueue([...list, song], index);
        showDialog('In coda', `"${title}" è stato aggiunto in fondo alla coda.`);
      } else {
        const next = [...list];
        next.splice(index + 1, 0, song);
        rememberQueue(next, index);
        showDialog('Riproduci dopo', `"${title}" sarà il prossimo brano.`);
      }
      return;
    }

    const next = where === 'last' ? [...list, song] : [song, ...list];
    rememberQueue(next, -1);
    showDialog('In coda', `"${title}" è stato aggiunto alla coda.`);
  };

  const enqueueSongNext = (song: Song) => enqueueSong(song, 'next');
  const enqueueSongLast = (song: Song) => enqueueSong(song, 'last');

  const requestEditSong = (song: Song) => {
    setSongPendingEdit(song);
  };

  const clearPendingEdit = () => {
    setSongPendingEdit(null);
  };

  const notifyLibraryChanged = () => {
    setLibraryVersion((version) => version + 1);
  };

  const startShufflePlayback = async (songsList: Song[]) => {
    const playable = songsList.filter(track => !!track.urlFileAudio);
    if (playable.length === 0) {
      showDialog('Nessun brano', 'Non ci sono brani da riprodurre');
      return;
    }

    shufflePoolRef.current = playable;
    queueRef.current = [];
    currentIndexRef.current = -1;
    setQueue([]);

    const first = playable[Math.floor(Math.random() * playable.length)];
    try {
      await playSongInternal(first, true);
    } catch (err) {
      console.error('Error starting shuffle playback:', err);
      shufflePoolRef.current = [];
      showDialog('Errore Riproduzione', 'Impossibile riprodurre i brani.');
    }
  };

  const nextSong = () => {
    if (shufflePoolRef.current.length > 0) {
      const pool = shufflePoolRef.current.filter(track => !!track.urlFileAudio);
      const others = activeSong ? pool.filter(track => track.id !== activeSong.id) : pool;
      const choices = others.length > 0 ? others : pool;
      const nextTrack = choices[Math.floor(Math.random() * choices.length)];
      if (nextTrack) {
        playSongInternal(nextTrack, true);
        return;
      }
    }

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
        startShufflePlayback,
        playSongOnly,
        playSongAndOpen,
        enqueueSongNext,
        enqueueSongLast,
        songPendingEdit,
        requestEditSong,
        clearPendingEdit,
        libraryVersion,
        notifyLibraryChanged,
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
