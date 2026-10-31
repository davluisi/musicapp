import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { showDialog } from './DialogContext';
import TrackPlayer, {
  Capability,
  Event,
  State,
  usePlaybackState,
  useProgress,
  Track,
} from 'react-native-track-player';
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

let isSetup = false;
async function setupPlayerIfNeeded() {
  if (isSetup) return;
  try {
    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
    });
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],
      compactCapabilities: [
        Capability.SkipToPrevious,
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
    });
    isSetup = true;
  } catch (e: any) {
    if (e?.message?.includes('already been initialized')) {
      isSetup = true;
    } else {
      console.warn('TrackPlayer setup error:', e);
    }
  }
}

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSong, setActiveSong] = useState<Song | null>(null);
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

  // TrackPlayer hooks
  const playbackStateObj = usePlaybackState();
  const playbackState = (playbackStateObj as any)?.state ?? playbackStateObj;
  const isPlaying = playbackState === State.Playing;

  const progress = useProgress(500);
  const playbackPosition = progress.position;
  const playbackDuration = progress.duration;

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

  const toTrack = (song: Song): Track => {
    const audioUrl = getMediaUrl(song.urlFileAudio!);
    const coverUrl = getSongCoverUrl(song) || undefined;
    const artist = song.artisti && song.artisti.length > 0
      ? song.artisti.map((a) => a.nome).join(', ')
      : 'Artista Sconosciuto';

    return {
      id: String(song.id),
      url: audioUrl,
      title: getSongTitle(song),
      artist,
      album: song.album?.nome || undefined,
      artwork: coverUrl,
      duration: undefined,
    };
  };

  useEffect(() => {
    setupPlayerIfNeeded();

    const trackChangeListener = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      async (event) => {
        if (event.track) {
          const trackId = Number(event.track.id);
          const found = queueRef.current.find((s) => s.id === trackId);
          if (found) {
            setActiveSong(found);
            const idx = queueRef.current.findIndex((s) => s.id === trackId);
            if (idx >= 0) {
              currentIndexRef.current = idx;
            }
          }
        }
      }
    );

    const queueEndedListener = TrackPlayer.addEventListener(
      Event.PlaybackQueueEnded,
      () => {
        if (shufflePoolRef.current.length > 0) {
          nextSong();
        }
      }
    );

    return () => {
      trackChangeListener.remove();
      queueEndedListener.remove();
    };
  }, []);

  const stopAndClearPlayer = async () => {
    try {
      await TrackPlayer.reset();
    } catch (e) {
      console.warn('Error resetting TrackPlayer:', e);
    }
    queueRef.current = [];
    currentIndexRef.current = -1;
    shufflePoolRef.current = [];
    setQueue([]);
    setActiveSong(null);
  };

  const playSongInternal = async (song: Song, autoStart = true): Promise<void> => {
    if (!song.urlFileAudio) {
      showDialog('File Audio Mancante', 'Questa canzone non ha un file audio collegato');
      return;
    }

    await setupPlayerIfNeeded();
    setActiveSong(song);

    try {
      await TrackPlayer.reset();
      await TrackPlayer.add(toTrack(song));
      if (autoStart) {
        await TrackPlayer.play();
      }
    } catch (err) {
      console.error('TrackPlayer play error:', err);
      showDialog('Errore Audio', 'Impossibile riprodurre la traccia.');
    }
  };

  const togglePlaySong = async (song: Song, autoStart = true) => {
    if (!song.urlFileAudio) {
      showDialog('File Audio Mancante', 'Questa canzone non ha un file audio collegato');
      return;
    }

    if (activeSong?.id === song.id) {
      if (isPlaying) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
      return;
    }

    shufflePoolRef.current = [];
    queueRef.current = [song];
    currentIndexRef.current = 0;
    setQueue([song]);

    await playSongInternal(song, autoStart);
  };

  const playQueue = async (songsList: Song[], startIndex = 0) => {
    const playable = songsList.filter((track) => !!track.urlFileAudio);
    if (!playable || playable.length === 0) {
      showDialog('Nessun brano', 'Questo album o elenco non contiene brani validi da riprodurre');
      return;
    }

    const safeIndex = Math.max(0, Math.min(playable.length - 1, startIndex));
    shufflePoolRef.current = [];
    queueRef.current = playable;
    currentIndexRef.current = safeIndex;
    setQueue(playable);

    await setupPlayerIfNeeded();
    const tracks = playable.map(toTrack);
    try {
      await TrackPlayer.reset();
      await TrackPlayer.add(tracks);
      await TrackPlayer.skip(safeIndex);
      await TrackPlayer.play();
      setActiveSong(playable[safeIndex]);
    } catch (err) {
      console.error('Error starting queue playback:', err);
      showDialog('Errore Riproduzione', 'Impossibile avviare la riproduzione della coda.');
    }
  };

  const handleMiniPlayerToggle = async () => {
    if (!activeSong) return;
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
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

  const handleSeek = async (ratio: number) => {
    if (playbackDuration > 0) {
      const targetTime = Math.max(0, Math.min(playbackDuration, ratio * playbackDuration));
      try {
        await TrackPlayer.seekTo(targetTime);
      } catch (e) {
        console.warn('Seek error:', e);
      }
    }
  };

  const restartSong = async () => {
    try {
      await TrackPlayer.seekTo(0);
      if (!isPlaying) {
        await TrackPlayer.play();
      }
    } catch (e) {
      console.warn('restartSong seekTo error:', e);
      if (activeSong) {
        togglePlaySong(activeSong, true);
      }
    }
  };

  const playSongOnly = async (song: Song) => {
    if (!song.urlFileAudio) {
      showDialog('File Audio Mancante', 'Questa canzone non ha un file audio collegato');
      return;
    }

    if (activeSong?.id === song.id) {
      if (!isPlaying) {
        await TrackPlayer.play();
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

  const enqueueSong = async (song: Song, where: 'next' | 'last') => {
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
        try {
          await TrackPlayer.add(toTrack(song));
        } catch (e) {}
        showDialog('In coda', `"${title}" è stato aggiunto in fondo alla coda.`);
      } else {
        const next = [...list];
        next.splice(index + 1, 0, song);
        rememberQueue(next, index);
        try {
          await TrackPlayer.add(toTrack(song), index + 1);
        } catch (e) {}
        showDialog('Riproduci dopo', `"${title}" sarà il prossimo brano.`);
      }
      return;
    }

    const next = where === 'last' ? [...list, song] : [song, ...list];
    rememberQueue(next, -1);
    try {
      await TrackPlayer.add(toTrack(song));
    } catch (e) {}
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
    const playable = songsList.filter((track) => !!track.urlFileAudio);
    if (playable.length === 0) {
      showDialog('Nessun brano', 'Non ci sono brani da riprodurre');
      return;
    }

    // Mescola in modo casuale l'elenco
    const shuffled = [...playable].sort(() => Math.random() - 0.5);
    shufflePoolRef.current = shuffled;
    queueRef.current = shuffled;
    currentIndexRef.current = 0;
    setQueue(shuffled);

    await setupPlayerIfNeeded();
    const tracks = shuffled.map(toTrack);
    try {
      await TrackPlayer.reset();
      await TrackPlayer.add(tracks);
      await TrackPlayer.play();
      setActiveSong(shuffled[0]);
    } catch (err) {
      console.error('Error starting shuffle playback:', err);
      shufflePoolRef.current = [];
      showDialog('Errore Riproduzione', 'Impossibile avviare riproduzione casuale.');
    }
  };

  const nextSong = async () => {
    try {
      const activeIdx = await TrackPlayer.getActiveTrackIndex();
      const queueList = await TrackPlayer.getQueue();
      if (activeIdx !== undefined && activeIdx < queueList.length - 1) {
        await TrackPlayer.skipToNext();
        return;
      }
    } catch (e) {
      // Fallback manuale su queueRef
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
