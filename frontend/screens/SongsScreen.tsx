import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { songApi, artistApi, albumApi, playlistApi, uploadApi, getMediaUrl, Song, Artist, Album, Playlist } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { useAudio } from '../services/AudioContext';
import { theme } from '../services/theme';
import { showDialog } from '../services/DialogContext';

export function SongsScreen() {
  const { user, isLoggedIn } = useAuth();

  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Form states
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [nome, setNome] = useState('');
  const [anno, setAnno] = useState('');
  const [urlImmagine, setUrlImmagine] = useState('');
  const [urlFileAudio, setUrlFileAudio] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<number | null>(null);
  const [selectedArtists, setSelectedArtists] = useState<number[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<number[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [downloadingAudio, setDownloadingAudio] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Picker modals states
  const [artistPickerVisible, setArtistPickerVisible] = useState(false);
  const [artistSearchQuery, setArtistSearchQuery] = useState('');

  const [albumPickerVisible, setAlbumPickerVisible] = useState(false);
  const [albumSearchQuery, setAlbumSearchQuery] = useState('');

  const [playlistPickerVisible, setPlaylistPickerVisible] = useState(false);
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');

  const openAddModal = () => {
    setEditingSong(null);
    setNome('');
    setAnno('');
    setUrlImmagine('');
    setUrlFileAudio('');
    setYoutubeUrl('');
    setSelectedAlbum(null);
    setSelectedArtists([]);
    setSelectedPlaylists([]);
    setModalVisible(true);
  };

  const openEditModal = async (song: Song) => {
    setEditingSong(song);
    setNome(song.nome || '');
    setAnno(song.anno != null ? String(song.anno) : '');
    setUrlImmagine(song.urlImmagine || '');
    setUrlFileAudio(song.urlFileAudio || '');
    setYoutubeUrl('');
    setSelectedAlbum(song.album ? song.album.id : null);
    setSelectedArtists(song.artisti ? song.artisti.map(a => a.id) : []);
    setSelectedPlaylists([]);
    setModalVisible(true);

    if (isLoggedIn && user) {
      try {
        const playlistIds = await playlistApi.getPlaylistIdsForCanzone(song.id, user.id);
        setSelectedPlaylists(playlistIds);
      } catch (err) {
        console.error('Error fetching playlist ids for song', err);
      }
    }
  };

  const handleSaveSong = async () => {
    if (!urlFileAudio.trim()) {
      showDialog('File Audio Mancante', 'Scarica prima un file audio da YouTube o inserisci l\'URL');
      return;
    }

    setSubmitting(true);
    try {
      const selectedArtistObjects = artists.filter(a => selectedArtists.includes(a.id));
      const selectedAlbumObject = selectedAlbum ? albums.find(a => a.id === selectedAlbum) : undefined;

      let savedSongId: number;
      if (editingSong) {
        const updated = await songApi.update(editingSong.id, {
          nome: nome.trim() || undefined,
          urlFileAudio: urlFileAudio.trim(),
          anno: anno ? Number(anno) : undefined,
          urlImmagine: urlImmagine || undefined,
          album: selectedAlbumObject || undefined,
          artisti: selectedArtistObjects,
        });
        savedSongId = updated.id;
        setSongs(prev => prev.map(s => s.id === editingSong.id ? updated : s));
      } else {
        const newSong = await songApi.create({
          nome: nome.trim() || undefined,
          urlFileAudio: urlFileAudio.trim(),
          anno: anno ? Number(anno) : undefined,
          urlImmagine: urlImmagine || undefined,
          album: selectedAlbumObject || undefined,
          artisti: selectedArtistObjects,
        });
        savedSongId = newSong.id;
        setSongs(prev => [newSong, ...prev]);
      }

      // Sincronizza l'assegnazione alle playlist dell'utente loggato
      if (isLoggedIn && user) {
        try {
          await playlistApi.syncCanzonePlaylists(savedSongId, user.id, selectedPlaylists);
        } catch (syncErr) {
          console.error('Error syncing playlists:', syncErr);
        }
      }

      showDialog('Successo', editingSong ? 'Brano modificato con successo!' : 'Brano aggiunto alla tua libreria!');

      setModalVisible(false);
      setEditingSong(null);
      setNome('');
      setAnno('');
      setUrlImmagine('');
      setUrlFileAudio('');
      setSelectedAlbum(null);
      setSelectedArtists([]);
      setSelectedPlaylists([]);
    } catch (error) {
      showDialog('Errore', editingSong ? 'Impossibile modificare il brano' : 'Impossibile salvare il brano');
    } finally {
      setSubmitting(false);
    }
  };

  const {
    activeSong,
    isPlaying,
    playSongAndOpen,
    openSongOptions,
    getSongTitle,
    songPendingEdit,
    clearPendingEdit,
    libraryVersion,
  } = useAudio();

  const activeSongId = activeSong ? activeSong.id : null;

  useEffect(() => {
    loadData();
  }, [isLoggedIn, user?.id, libraryVersion]);

  useEffect(() => {
    if (!songPendingEdit) return;
    openEditModal(songPendingEdit);
    clearPendingEdit();
  }, [songPendingEdit]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [isLoggedIn, user?.id])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const promises: [Promise<Song[]>, Promise<Artist[]>, Promise<Album[]>, Promise<Playlist[]>] = [
        songApi.getAll(),
        artistApi.getAll(),
        albumApi.getAll(),
        isLoggedIn && user ? playlistApi.getByUtente(user.id) : Promise.resolve([]),
      ];
      const [songsData, artistsData, albumsData, playlistsData] = await Promise.all(promises);
      setSongs(songsData);
      setArtists(artistsData);
      setAlbums(albumsData);
      setUserPlaylists(playlistsData);
    } catch (error) {
      console.error('Error fetching songs data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setUploadingImage(true);
      try {
        const asset = result.assets[0];
        let file: any;

        if (Platform.OS === 'web') {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          file = new File([blob], 'song.jpg', { type: asset.mimeType || 'image/jpeg' });
        } else {
          file = {
            uri: asset.uri,
            name: asset.fileName || 'song.jpg',
            type: asset.mimeType || 'image/jpeg',
          };
        }

        const uploadedUrl = await uploadApi.uploadImage('canzone', file);
        setUrlImmagine(uploadedUrl);
      } catch (error) {
        showDialog('Errore', 'Impossibile caricare l\'immagine');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const downloadFromYouTube = async () => {
    if (!youtubeUrl.trim()) {
      showDialog('Link Mancante', 'Inserisci un link YouTube valido');
      return;
    }

    setDownloadingAudio(true);
    try {
      const result = await uploadApi.downloadFromYouTube(youtubeUrl.trim());
      setUrlFileAudio(result.audioUrl);
      
      // Se YouTube fornisce la copertina e l'utente non ne ha già caricata una manualmente
      if (result.imageUrl && (!urlImmagine || urlImmagine.trim() === '')) {
        setUrlImmagine(result.imageUrl);
      }

      // Se YouTube fornisce il titolo e l'utente non ne ha già inserito uno
      if (result.title && (!nome || nome.trim() === '')) {
        setNome(result.title);
      }

      setYoutubeUrl('');
      showDialog('Download Completato', 'Audio e copertina estratti con successo da YouTube!');
    } catch (error: any) {
      console.error('YouTube download error details:', error?.response?.data || error?.message || error);
      const serverMsg = error?.response?.data?.message || error?.message || 'Impossibile scaricare l\'audio dal link specificato';
      showDialog('Errore YouTube', serverMsg);
    } finally {
      setDownloadingAudio(false);
    }
  };

  const toggleArtist = (artistId: number) => {
    setSelectedArtists(prev =>
      prev.includes(artistId)
        ? prev.filter(id => id !== artistId)
        : [...prev, artistId]
    );
  };

  const togglePlaylist = (playlistId: number) => {
    setSelectedPlaylists(prev =>
      prev.includes(playlistId)
        ? prev.filter(id => id !== playlistId)
        : [...prev, playlistId]
    );
  };



  const openPlaylistPickerForSong = async (song: Song) => {
    if (!isLoggedIn || !user) {
      showDialog('Accesso Richiesto', 'Devi aver effettuato l\'accesso per gestire le playlist.');
      return;
    }
    setEditingSong(song);
    try {
      const playlistIds = await playlistApi.getPlaylistIdsForCanzone(song.id, user.id);
      setSelectedPlaylists(playlistIds);
      setPlaylistPickerVisible(true);
    } catch (err) {
      console.error('Error fetching playlist ids for song', err);
      showDialog('Errore', 'Impossibile caricare le playlist.');
    }
  };

  const handleSavePlaylistsForSong = async () => {
    if (!editingSong || !user) return;
    try {
      await playlistApi.syncCanzonePlaylists(editingSong.id, user.id, selectedPlaylists);
      setPlaylistPickerVisible(false);
      showDialog('Successo', 'Playlist aggiornate con successo!');
    } catch (err) {
      console.error('Error syncing playlists:', err);
      showDialog('Errore', 'Impossibile aggiornare le playlist');
    }
  };

  const filteredSongs = songs.filter(song => {
    const titleMatch = getSongTitle(song).toLowerCase().includes(searchQuery.toLowerCase());
    const artistMatch = song.artisti?.some(a =>
      a.nome.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const albumMatch = song.album?.nome.toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || artistMatch || albumMatch;
  });

  const renderSong = ({ item }: { item: Song }) => {
    const isThisSelected = activeSongId === item.id;

    return (
      <TouchableOpacity
        style={[styles.songCard, isThisSelected && styles.songCardActive]}
        onPress={() => playSongAndOpen(item)}
        activeOpacity={0.8}
      >
        <View style={styles.songCoverContainer}>
          {item.urlImmagine ? (
            <Image source={{ uri: getMediaUrl(item.urlImmagine) }} style={styles.songCover} />
          ) : (
            <View style={styles.songCoverPlaceholder}>
              <Ionicons name="musical-note" size={24} color={theme.colors.textMuted} />
            </View>
          )}
        </View>

        <View style={styles.songInfo}>
          <Text
            style={[styles.songTitle, isThisSelected && styles.songTitleActive]}
            numberOfLines={1}
          >
            {getSongTitle(item)}
          </Text>
          <Text style={styles.songArtists} numberOfLines={1}>
            {item.artisti && item.artisti.length > 0
              ? item.artisti.map(a => a.nome).join(', ')
              : 'Artista sconosciuto'}
            {item.album ? ` • ${item.album.nome}` : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.cardPlayBtn}
          onPress={(e) => {
            e.stopPropagation();
            openSongOptions(item);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Info & Action */}
      <View style={styles.header}>
        <Text style={styles.subtitle}>{songs.length} disponibili</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#000" />
          <Text style={styles.addButtonText}>Nuova</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca canzone, artista o album..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Songs List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Caricamento canzoni...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSongs}
          renderItem={renderSong}
          keyExtractor={item => item.id.toString()}
          extraData={[activeSongId, isPlaying]}
          contentContainerStyle={[
            styles.listContent,
            activeSong ? { paddingBottom: 110 } : { paddingBottom: 30 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="musical-notes-outline" size={64} color={theme.colors.surfaceBorder} />
              <Text style={styles.emptyTitle}>Nessuna canzone presente</Text>
              <Text style={styles.emptySubtitle}>
                Scarica la prima traccia da YouTube cliccando su "Nuova"
              </Text>
            </View>
          }
        />
      )}



      {/* Modal Add Song */}
      <Modal
        visible={modalVisible}
        animationType="none"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSong ? 'Modifica Canzone' : 'Aggiungi Canzone'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {/* YouTube Audio Importer */}
              <View style={styles.ytSection}>
                <Text style={styles.ytSectionTitle}>Importa Audio da YouTube</Text>
                <View style={styles.ytInputWrapper}>
                  <Ionicons name="logo-youtube" size={20} color="#FF0000" />
                  <TextInput
                    style={styles.ytInput}
                    placeholder="Incolla link YouTube *"
                    placeholderTextColor={theme.colors.textMuted}
                    value={youtubeUrl}
                    onChangeText={setYoutubeUrl}
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity
                  style={styles.ytDownloadBtn}
                  onPress={downloadFromYouTube}
                  disabled={downloadingAudio}
                >
                  {downloadingAudio ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={18} color="#fff" />
                      <Text style={styles.ytDownloadBtnText}>Estrai Audio</Text>
                    </>
                  )}
                </TouchableOpacity>

                {urlFileAudio ? (
                  <View style={styles.successAudioBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                    <Text style={styles.successAudioText} numberOfLines={1}>
                      Traccia pronta per il salvataggio
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Cover Song Picker */}
              <View style={styles.coverSection}>
                <TouchableOpacity
                  style={styles.modalCoverPicker}
                  onPress={pickImage}
                  disabled={uploadingImage}
                >
                  {urlImmagine ? (
                    <>
                      <Image source={{ uri: urlImmagine }} style={styles.modalCoverPreview} />
                      <View style={styles.modalCoverOverlayBadge}>
                        <Ionicons name="camera" size={14} color="#fff" />
                        <Text style={styles.modalCoverOverlayBadgeText}>Cambia Foto</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.modalCoverPlaceholder}>
                      <Ionicons name="image-outline" size={28} color={theme.colors.textSecondary} />
                      <Text style={styles.modalCoverText}>
                        {uploadingImage ? 'Caricamento...' : 'Seleziona Copertina dal Telefono'}
                      </Text>
                      <Text style={styles.modalCoverSubtext}>
                        (Se scarichi da YouTube, verrà estratta in automatico se non ne imposti una)
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder="Titolo Canzone (opzionale)"
                placeholderTextColor={theme.colors.textMuted}
                value={nome}
                onChangeText={setNome}
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Anno di uscita (opzionale)"
                placeholderTextColor={theme.colors.textMuted}
                value={anno}
                onChangeText={setAnno}
                keyboardType="numeric"
              />

              {/* Select Album Trigger */}
              <View style={styles.selectorField}>
                <View style={styles.selectorFieldHeader}>
                  <Text style={styles.selectorLabel}>Album</Text>
                  <TouchableOpacity
                    style={styles.selectorOpenBtn}
                    onPress={() => {
                      setAlbumSearchQuery('');
                      setAlbumPickerVisible(true);
                    }}
                  >
                    <Ionicons name="disc-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.selectorOpenBtnText}>
                      {selectedAlbum ? 'Cambia Album' : 'Seleziona Album'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.selectedItemsContainer}>
                  {selectedAlbum ? (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="disc" size={14} color={theme.colors.primary} />
                      <Text style={styles.selectedBadgeText} numberOfLines={1}>
                        {albums.find(a => a.id === selectedAlbum)?.nome || 'Album'}
                      </Text>
                      <TouchableOpacity onPress={() => setSelectedAlbum(null)}>
                        <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.selectorEmptyHint}>Singolo (Nessun album associato)</Text>
                  )}
                </View>
              </View>

              {/* Select Artists Trigger */}
              <View style={styles.selectorField}>
                <View style={styles.selectorFieldHeader}>
                  <Text style={styles.selectorLabel}>Artisti ({selectedArtists.length})</Text>
                  <TouchableOpacity
                    style={styles.selectorOpenBtn}
                    onPress={() => {
                      setArtistSearchQuery('');
                      setArtistPickerVisible(true);
                    }}
                  >
                    <Ionicons name="people-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.selectorOpenBtnText}>
                      {selectedArtists.length > 0 ? 'Modifica Artisti' : 'Seleziona Artisti'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.selectedItemsContainer}>
                  {selectedArtists.length > 0 ? (
                    artists
                      .filter(a => selectedArtists.includes(a.id))
                      .map(a => (
                        <View key={a.id} style={styles.selectedBadge}>
                          <Ionicons name="person" size={14} color={theme.colors.primary} />
                          <Text style={styles.selectedBadgeText} numberOfLines={1}>
                            {a.nome}
                          </Text>
                          <TouchableOpacity onPress={() => toggleArtist(a.id)}>
                            <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      ))
                  ) : (
                    <Text style={styles.selectorEmptyHint}>Nessun artista selezionato</Text>
                  )}
                </View>
              </View>

              {/* Select Playlist Trigger (Logged user only) */}
              {isLoggedIn && (
                <View style={styles.selectorField}>
                  <View style={styles.selectorFieldHeader}>
                    <Text style={styles.selectorLabel}>Playlist ({selectedPlaylists.length})</Text>
                    <TouchableOpacity
                      style={styles.selectorOpenBtn}
                      onPress={() => {
                        setPlaylistSearchQuery('');
                        setPlaylistPickerVisible(true);
                      }}
                    >
                      <Ionicons name="list-outline" size={16} color={theme.colors.primary} />
                      <Text style={styles.selectorOpenBtnText}>
                        {selectedPlaylists.length > 0 ? 'Modifica Playlist' : 'Aggiungi a Playlist'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.selectedItemsContainer}>
                    {selectedPlaylists.length > 0 ? (
                      userPlaylists
                        .filter(p => selectedPlaylists.includes(p.id))
                        .map(p => (
                          <View key={p.id} style={styles.selectedBadge}>
                            <Ionicons name="list" size={14} color={theme.colors.primary} />
                            <Text style={styles.selectedBadgeText} numberOfLines={1}>
                              {p.nome}
                            </Text>
                            <TouchableOpacity onPress={() => togglePlaylist(p.id)}>
                              <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                            </TouchableOpacity>
                          </View>
                        ))
                    ) : (
                      <Text style={styles.selectorEmptyHint}>Non ancora aggiunta a nessuna playlist</Text>
                    )}
                  </View>
                </View>
              )}

              {/* Save actions */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveSong}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {editingSong ? 'Salva Modifiche' : 'Salva Canzone'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Picker Album */}
      <Modal
        visible={albumPickerVisible}
        animationType="none"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setAlbumPickerVisible(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalCard}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Seleziona Album</Text>
              <TouchableOpacity onPress={() => setAlbumPickerVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchBar}>
              <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Cerca album per nome..."
                placeholderTextColor={theme.colors.textMuted}
                value={albumSearchQuery}
                onChangeText={setAlbumSearchQuery}
                autoFocus={true}
              />
              {albumSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setAlbumSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.pickerListScroll} showsVerticalScrollIndicator={false}>
              {/* Option: No Album / Singolo */}
              <TouchableOpacity
                style={[
                  styles.pickerItemRow,
                  selectedAlbum === null && styles.pickerItemRowSelected,
                ]}
                onPress={() => {
                  setSelectedAlbum(null);
                  setAlbumPickerVisible(false);
                }}
              >
                <View style={styles.pickerItemIconCircle}>
                  <Ionicons name="disc-outline" size={20} color={theme.colors.textSecondary} />
                </View>
                <View style={styles.pickerItemTextCol}>
                  <Text style={[styles.pickerItemTitle, selectedAlbum === null && styles.pickerItemTitleSelected]}>
                    Singolo
                  </Text>
                  <Text style={styles.pickerItemSubtitle}>Nessun album associato</Text>
                </View>
                {selectedAlbum === null && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>

              {albums
                .filter(a => a.nome.toLowerCase().includes(albumSearchQuery.toLowerCase()))
                .map(album => {
                  const isSelected = selectedAlbum === album.id;
                  return (
                    <TouchableOpacity
                      key={album.id}
                      style={[
                        styles.pickerItemRow,
                        isSelected && styles.pickerItemRowSelected,
                      ]}
                      onPress={() => {
                        setSelectedAlbum(album.id);
                        setAlbumPickerVisible(false);
                      }}
                    >
                      <View style={styles.pickerItemCoverWrapper}>
                        {album.urlImmagine ? (
                          <Image source={{ uri: album.urlImmagine }} style={styles.pickerItemThumb} />
                        ) : (
                          <View style={styles.pickerItemPlaceholder}>
                            <Ionicons name="disc" size={18} color={theme.colors.textMuted} />
                          </View>
                        )}
                      </View>
                      <View style={styles.pickerItemTextCol}>
                        <Text style={[styles.pickerItemTitle, isSelected && styles.pickerItemTitleSelected]}>
                          {album.nome}
                        </Text>
                        <Text style={styles.pickerItemSubtitle}>
                          {album.anno ? `${album.anno}` : 'Anno sconosciuto'}
                          {album.artisti && album.artisti.length > 0 ? ` • ${album.artisti.map(a => a.nome).join(', ')}` : ''}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <TouchableOpacity
              style={styles.pickerDoneBtn}
              onPress={() => setAlbumPickerVisible(false)}
            >
              <Text style={styles.pickerDoneBtnText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Picker Artisti */}
      <Modal
        visible={artistPickerVisible}
        animationType="none"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setArtistPickerVisible(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalCard}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Seleziona Artisti</Text>
              <TouchableOpacity onPress={() => setArtistPickerVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchBar}>
              <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Cerca artista per nome..."
                placeholderTextColor={theme.colors.textMuted}
                value={artistSearchQuery}
                onChangeText={setArtistSearchQuery}
                autoFocus={true}
              />
              {artistSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setArtistSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.pickerListScroll} showsVerticalScrollIndicator={false}>
              {artists
                .filter(a => a.nome.toLowerCase().includes(artistSearchQuery.toLowerCase()))
                .map(artist => {
                  const isSelected = selectedArtists.includes(artist.id);
                  return (
                    <TouchableOpacity
                      key={artist.id}
                      style={[
                        styles.pickerItemRow,
                        isSelected && styles.pickerItemRowSelected,
                      ]}
                      onPress={() => toggleArtist(artist.id)}
                    >
                      <View style={styles.pickerItemCoverWrapper}>
                        {artist.urlImmagine ? (
                          <Image source={{ uri: artist.urlImmagine }} style={[styles.pickerItemThumb, { borderRadius: 18 }]} />
                        ) : (
                          <View style={[styles.pickerItemPlaceholder, { borderRadius: 18 }]}>
                            <Ionicons name="person" size={18} color={theme.colors.textMuted} />
                          </View>
                        )}
                      </View>
                      <View style={styles.pickerItemTextCol}>
                        <Text style={[styles.pickerItemTitle, isSelected && styles.pickerItemTitleSelected]}>
                          {artist.nome}
                        </Text>
                        <Text style={styles.pickerItemSubtitle}>Artista</Text>
                      </View>
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={isSelected ? theme.colors.primary : theme.colors.textMuted}
                      />
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <TouchableOpacity
              style={styles.pickerDoneBtn}
              onPress={() => setArtistPickerVisible(false)}
            >
              <Text style={styles.pickerDoneBtnText}>Fatto ({selectedArtists.length} selezionati)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Picker Playlist */}
      <Modal
        visible={playlistPickerVisible}
        animationType="none"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setPlaylistPickerVisible(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalCard}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Seleziona Playlist</Text>
              <TouchableOpacity onPress={() => setPlaylistPickerVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchBar}>
              <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Cerca playlist per nome..."
                placeholderTextColor={theme.colors.textMuted}
                value={playlistSearchQuery}
                onChangeText={setPlaylistSearchQuery}
                autoFocus={true}
              />
              {playlistSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setPlaylistSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.pickerListScroll} showsVerticalScrollIndicator={false}>
              {userPlaylists
                .filter(p => p.nome.toLowerCase().includes(playlistSearchQuery.toLowerCase()))
                .map(playlist => {
                  const isSelected = selectedPlaylists.includes(playlist.id);
                  return (
                    <TouchableOpacity
                      key={playlist.id}
                      style={[
                        styles.pickerItemRow,
                        isSelected && styles.pickerItemRowSelected,
                      ]}
                      onPress={() => togglePlaylist(playlist.id)}
                    >
                      <View style={styles.pickerItemCoverWrapper}>
                        {playlist.urlImmagine ? (
                          <Image source={{ uri: playlist.urlImmagine }} style={styles.pickerItemThumb} />
                        ) : (
                          <View style={styles.pickerItemPlaceholder}>
                            <Ionicons name="list" size={18} color={theme.colors.textMuted} />
                          </View>
                        )}
                      </View>
                      <View style={styles.pickerItemTextCol}>
                        <Text style={[styles.pickerItemTitle, isSelected && styles.pickerItemTitleSelected]}>
                          {playlist.nome}
                        </Text>
                        <Text style={styles.pickerItemSubtitle}>La tua playlist</Text>
                      </View>
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={isSelected ? theme.colors.primary : theme.colors.textMuted}
                      />
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <TouchableOpacity
              style={styles.pickerDoneBtn}
              onPress={() => setPlaylistPickerVisible(false)}
            >
              <Text style={styles.pickerDoneBtnText}>Fatto ({selectedPlaylists.length} selezionate)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: theme.borderRadius.full,
  },
  addButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: theme.colors.text,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 30,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  songCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceHighlight,
  },
  songCoverContainer: {
    position: 'relative',
    marginRight: 14,
  },
  songCover: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  songCoverPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlayActive: {
    backgroundColor: theme.colors.primary,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  songTitleActive: {
    color: theme.colors.primary,
  },
  songArtists: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  songYear: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginLeft: 8,
    marginRight: 8,
  },
  actionBtn: {
    padding: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 10,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  /* Sticky Player */
  miniPlayer: {
    position: 'absolute',
    bottom: 12,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  miniPlayerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  miniPlayerCover: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 10,
  },
  miniPlayerPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  miniPlayerTextContainer: {
    flex: 1,
  },
  miniPlayerTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  miniPlayerArtist: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  miniPlayerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniPlayerPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    maxHeight: '90%',
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  modalScroll: {
    maxHeight: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  ytSection: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginBottom: theme.spacing.md,
  },
  ytSectionTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  ytInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginBottom: 10,
  },
  ytInput: {
    flex: 1,
    color: theme.colors.text,
    paddingVertical: 10,
    marginLeft: 8,
    fontSize: 13,
  },
  ytDownloadBtn: {
    backgroundColor: '#CC0000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.sm,
    gap: 6,
  },
  ytDownloadBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  successAudioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: 8,
    borderRadius: theme.borderRadius.sm,
  },
  successAudioText: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  coverSection: {
    marginBottom: theme.spacing.md,
  },
  modalCoverPicker: {
    height: 140,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  modalCoverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 4,
  },
  modalCoverPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  modalCoverOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  modalCoverOverlayBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  modalCoverText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalCoverSubtext: {
    color: theme.colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  modalInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  horizontalChips: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  chip: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#000',
    fontWeight: '700',
  },
  artistListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.xl,
  },
  artistBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  artistBadgeSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  artistBadgeText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  artistBadgeTextSelected: {
    color: '#000',
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHighlight,
  },
  cancelBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  saveBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  /* Selector Fields and Summary Badges */
  selectorField: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surfaceHighlight,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  selectorFieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectorLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  selectorOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(29, 185, 84, 0.12)',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  selectorOpenBtnText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  selectedItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  selectedBadgeText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  selectorEmptyHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },

  /* Popup Picker Modal */
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  pickerModalCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  pickerSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    height: 42,
  },
  pickerSearchInput: {
    flex: 1,
    marginLeft: 8,
    color: theme.colors.text,
    fontSize: 14,
  },
  pickerListScroll: {
    maxHeight: 320,
    marginBottom: theme.spacing.md,
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.md,
    marginBottom: 6,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pickerItemRowSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceHighlight,
  },
  pickerItemIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pickerItemCoverWrapper: {
    marginRight: 12,
  },
  pickerItemThumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
  },
  pickerItemPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemTextCol: {
    flex: 1,
  },
  pickerItemTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  pickerItemTitleSelected: {
    color: theme.colors.primary,
  },
  pickerItemSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  pickerDoneBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  pickerDoneBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  cardPlayBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  /* Full screen / PageSheet Detail Modal Styles */
  detailContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  detailHeaderBtn: {
    padding: 6,
  },
  detailHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailCoverSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  detailLargeCover: {
    width: 290,
    height: 290,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },
  detailLargeCoverPlaceholder: {
    width: 290,
    height: 290,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  detailMetaSection: {
    marginBottom: 20,
  },
  detailSongTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 6,
  },
  detailSongArtists: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  detailSongAlbum: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  detailControlsSection: {
    marginTop: 10,
  },
  detailProgressBarTrack: {
    height: 6,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  detailProgressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  detailTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailTimeText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  detailPlayRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailPlayBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  /* 3 Dots Options Modal Styles */
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  optionsContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  optionsHeader: {
    paddingBottom: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  optionsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  optionsSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  optionRowDestructive: {
    marginTop: 4,
  },
  optionRowText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
  },
  optionRowTextDestructive: {
    color: theme.colors.danger,
  },
  optionCancelBtn: {
    marginTop: 14,
    paddingVertical: 13,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  optionCancelText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});

