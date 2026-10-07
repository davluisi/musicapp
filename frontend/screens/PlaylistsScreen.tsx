import React, { useState, useEffect, useCallback } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { playlistApi, uploadApi, getMediaUrl, Playlist, Song } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { useAudio } from '../services/AudioContext';
import { NowPlayingBanner } from '../components/GlobalMiniPlayer';
import { theme } from '../services/theme';
import { showDialog } from '../services/DialogContext';

export function PlaylistsScreen() {
  const { user, isLoggedIn } = useAuth();
  const {
    activeSong,
    isPlaying,
    playQueue,
    handleMiniPlayerToggle,
    playSongAndOpen,
    openSongOptions,
    libraryVersion,
  } = useAudio();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);

  // Form states
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [nome, setNome] = useState('');
  const [urlImmagine, setUrlImmagine] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadPlaylists = async () => {
    if (!isLoggedIn || !user) {
      setPlaylists([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);
      const data = await playlistApi.getByUtente(user.id);
      setPlaylists(data);
    } catch (error) {
      console.error('Error fetching playlists', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, [isLoggedIn, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadPlaylists();
    }, [isLoggedIn, user?.id])
  );

  const loadPlaylistSongs = async (playlistId: number) => {
    try {
      setSongsLoading(true);
      const songs = await playlistApi.getCanzoni(playlistId);
      setPlaylistSongs(songs);
    } catch (error) {
      console.error('Error fetching playlist songs', error);
      showDialog('Errore', 'Impossibile caricare i brani della playlist');
    } finally {
      setSongsLoading(false);
    }
  };

  useEffect(() => {
    if (detailModalVisible && selectedPlaylist) {
      loadPlaylistSongs(selectedPlaylist.id);
    }
  }, [libraryVersion]);

  const openPlaylistDetail = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setPlaylistSongs([]);
    setDetailModalVisible(true);
    loadPlaylistSongs(playlist.id);
  };

  const confirmDeletePlaylist = (playlist: Playlist) => {
    showDialog(
      'Elimina Playlist',
      `Sei sicuro di voler eliminare la playlist "${playlist.nome}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await playlistApi.delete(playlist.id);
              setPlaylists(prev => prev.filter(p => p.id !== playlist.id));
              setDetailModalVisible(false);
              setOptionsVisible(false);
              setSelectedPlaylist(null);
              showDialog('Successo', 'Playlist eliminata con successo');
            } catch (err) {
              console.error('Delete playlist error:', err);
              showDialog('Errore', 'Impossibile eliminare la playlist');
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPlaylists();
  };

  const openAddModal = () => {
    setEditingPlaylist(null);
    setNome('');
    setUrlImmagine('');
    setModalVisible(true);
  };

  const openEditModal = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setNome(playlist.nome);
    setUrlImmagine(playlist.urlImmagine || '');
    setModalVisible(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setUploading(true);
      try {
        const asset = result.assets[0];
        let file: any;

        if (Platform.OS === 'web') {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          file = new File([blob], 'playlist.jpg', { type: asset.mimeType || 'image/jpeg' });
        } else {
          file = {
            uri: asset.uri,
            name: asset.fileName || 'playlist.jpg',
            type: asset.mimeType || 'image/jpeg',
          };
        }

        const uploadedUrl = await uploadApi.uploadImage('playlist', file);
        setUrlImmagine(uploadedUrl);
      } catch (error) {
        showDialog('Errore', 'Impossibile caricare la copertina');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSavePlaylist = async () => {
    if (!nome.trim()) {
      showDialog('Attenzione', 'Inserisci un nome per la playlist');
      return;
    }

    if (!user) {
      showDialog('Errore', 'Devi essere autenticato');
      return;
    }

    setSubmitting(true);
    try {
      if (editingPlaylist) {
        const updated = await playlistApi.update(editingPlaylist.id, {
          nome: nome.trim(),
          urlImmagine: urlImmagine || undefined,
        });
        setPlaylists(prev => prev.map(p => p.id === editingPlaylist.id ? updated : p));
        if (selectedPlaylist?.id === updated.id) {
          setSelectedPlaylist(updated);
        }
        showDialog('Successo', 'Playlist aggiornata con successo');
      } else {
        const created = await playlistApi.create({
          nome: nome.trim(),
          urlImmagine: urlImmagine || undefined,
          utenteId: user.id,
        });
        setPlaylists(prev => [created, ...prev]);
        showDialog('Successo', 'Playlist creata con successo');
      }

      setModalVisible(false);
      setEditingPlaylist(null);
      setNome('');
      setUrlImmagine('');
    } catch (error) {
      showDialog('Errore', editingPlaylist ? 'Impossibile aggiornare la playlist' : 'Impossibile creare la playlist');
    } finally {
      setSubmitting(false);
    }
  };

  // Se l'utente non è loggato, mostra la pagina con il messaggio richiesto
  if (!isLoggedIn || !user) {
    return (
      <View style={styles.notLoggedContainer}>
        <View style={styles.notLoggedContent}>
          <View style={styles.iconCircle}>
            <Ionicons name="list" size={48} color={theme.colors.primary} />
          </View>
          <Text style={styles.notLoggedMessage}>
            Accedi per creare o vedere le tue playlist
          </Text>
        </View>
      </View>
    );
  }

  const filteredPlaylists = playlists.filter(p =>
    p.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isPlaylistQueueActive = !!selectedPlaylist && playlistSongs.some(song => song.id === activeSong?.id);
  const isPlaylistPlaying = isPlaylistQueueActive && isPlaying;

  const renderPlaylist = ({ item }: { item: Playlist }) => (
    <TouchableOpacity
      style={styles.playlistCard}
      onPress={() => openPlaylistDetail(item)}
      activeOpacity={0.8}
    >
      <View style={styles.coverWrapper}>
        {item.urlImmagine ? (
          <Image source={{ uri: getMediaUrl(item.urlImmagine) }} style={styles.playlistCover} />
        ) : (
          <View style={styles.playlistCoverPlaceholder}>
            <Ionicons name="musical-notes" size={30} color={theme.colors.textMuted} />
          </View>
        )}
      </View>
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistTitle} numberOfLines={1}>
          {item.nome}
        </Text>
        <Text style={styles.playlistOwner} numberOfLines={1}>
          Creata da {user.nome}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={(event) => {
          event.stopPropagation();
          openEditModal(item);
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="pencil-outline" size={20} color={theme.colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Info & Action */}
      <View style={styles.header}>
        <Text style={styles.subtitle}>{playlists.length} playlist create</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#000" />
          <Text style={styles.addButtonText}>Nuova</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca playlist..."
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

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Caricamento playlist...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPlaylists}
          renderItem={renderPlaylist}
          keyExtractor={item => item.id.toString()}
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
              <Ionicons name="list-outline" size={64} color={theme.colors.surfaceBorder} />
              <Text style={styles.emptyTitle}>Nessuna playlist creata</Text>
              <Text style={styles.emptySubtitle}>
                Tocca "Nuova" per creare la tua prima playlist personalizzata
              </Text>
            </View>
          }
        />
      )}

      {/* Pagina playlist */}
      <Modal
        visible={detailModalVisible && !!selectedPlaylist}
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        {selectedPlaylist && (
          <View style={styles.detailContainer}>
          <SafeAreaView style={styles.detailBody} edges={['top', 'left', 'right']}>
            <View style={styles.detailHeader}>
              <TouchableOpacity
                onPress={() => setDetailModalVisible(false)}
                style={styles.detailHeaderBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="chevron-down" size={28} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle} numberOfLines={1}>
                Playlist
              </Text>
              <TouchableOpacity
                onPress={() => setOptionsVisible(true)}
                style={styles.detailHeaderBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
              <View style={styles.detailHeroSection}>
                {selectedPlaylist.urlImmagine ? (
                  <Image
                    source={{ uri: getMediaUrl(selectedPlaylist.urlImmagine) }}
                    style={styles.detailCover}
                  />
                ) : (
                  <View style={styles.detailCoverPlaceholder}>
                    <Ionicons name="musical-notes" size={64} color={theme.colors.textMuted} />
                  </View>
                )}
                <Text style={styles.detailTitle}>{selectedPlaylist.nome}</Text>
                <Text style={styles.detailOwner}>Creata da {user.nome}</Text>
              </View>

              <View style={styles.detailTracksSection}>
                <View style={styles.detailTracksHeaderRow}>
                  <TouchableOpacity
                    style={[styles.playAllButton, playlistSongs.length === 0 && { opacity: 0.5 }]}
                    onPress={() => {
                      if (playlistSongs.length === 0) return;
                      if (isPlaylistQueueActive) {
                        handleMiniPlayerToggle();
                      } else {
                        playQueue(playlistSongs, 0);
                      }
                    }}
                    activeOpacity={0.8}
                    disabled={playlistSongs.length === 0}
                  >
                    <Ionicons
                      name={isPlaylistPlaying ? 'pause-circle' : 'play-circle'}
                      size={28}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.playAllText}>
                      {isPlaylistPlaying ? 'Pausa' : 'Riproduci brani'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.detailTracksCount}>
                    {songsLoading ? '...' : `${playlistSongs.length} brani`}
                  </Text>
                </View>

                {songsLoading ? (
                  <View style={styles.detailNoTracksBox}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  </View>
                ) : playlistSongs.length === 0 ? (
                  <View style={styles.detailNoTracksBox}>
                    <Ionicons name="musical-notes-outline" size={32} color={theme.colors.textMuted} />
                    <Text style={styles.detailNoTracksText}>Nessuna canzone in questa playlist</Text>
                  </View>
                ) : (
                  playlistSongs.map((song, index) => (
                    <TouchableOpacity
                      key={song.id}
                      style={styles.detailTrackRow}
                      onPress={() => playSongAndOpen(song)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.detailTrackNumber}>{index + 1}</Text>
                      {song.urlImmagine ? (
                        <Image source={{ uri: getMediaUrl(song.urlImmagine) }} style={styles.detailTrackThumb} />
                      ) : (
                        <View style={styles.detailTrackThumbPlaceholder}>
                          <Ionicons name="musical-note" size={16} color={theme.colors.textMuted} />
                        </View>
                      )}
                      <View style={styles.detailTrackInfo}>
                        <Text
                          style={[styles.detailTrackTitle, activeSong?.id === song.id && { color: theme.colors.primary }]}
                          numberOfLines={1}
                        >
                          {song.nome || 'Traccia ' + (index + 1)}
                        </Text>
                        <Text style={styles.detailTrackArtist} numberOfLines={1}>
                          {song.artisti && song.artisti.length > 0
                            ? song.artisti.map(a => a.nome).join(', ')
                            : 'Artista'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={(event) => {
                          event.stopPropagation();
                          openSongOptions(song);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.text} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
          <NowPlayingBanner />
          </View>
        )}
      </Modal>

      <Modal
        visible={optionsVisible && !!selectedPlaylist}
        animationType="none"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setOptionsVisible(false)}
      >
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setOptionsVisible(false)}
        >
          <View style={styles.optionsContent}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle} numberOfLines={1}>
                {selectedPlaylist?.nome}
              </Text>
              <Text style={styles.optionsSubtitle} numberOfLines={1}>
                Opzioni playlist
              </Text>
            </View>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                if (selectedPlaylist) {
                  setOptionsVisible(false);
                  openEditModal(selectedPlaylist);
                }
              }}
            >
              <Ionicons name="pencil-outline" size={22} color={theme.colors.text} />
              <Text style={styles.optionRowText}>Modifica</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionRow, styles.optionRowDestructive]}
              onPress={() => {
                if (selectedPlaylist) {
                  confirmDeletePlaylist(selectedPlaylist);
                }
              }}
            >
              <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
              <Text style={[styles.optionRowText, styles.optionRowTextDestructive]}>Elimina</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCancelBtn}
              onPress={() => setOptionsVisible(false)}
            >
              <Text style={styles.optionCancelText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Add/Edit Playlist */}
      <Modal
        visible={modalVisible}
        animationType="none"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPlaylist ? 'Modifica Playlist' : 'Crea Nuova Playlist'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* Cover picker */}
              <TouchableOpacity
                style={styles.modalCoverPicker}
                onPress={pickImage}
                disabled={uploading}
              >
                {urlImmagine ? (
                  <Image source={{ uri: getMediaUrl(urlImmagine) }} style={styles.modalCoverPreview} />
                ) : (
                  <View style={styles.modalCoverPlaceholder}>
                    <Ionicons name="image-outline" size={32} color={theme.colors.textSecondary} />
                    <Text style={styles.modalCoverText}>
                      {uploading ? 'Caricamento...' : 'Seleziona Copertina (Opzionale)'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.modalInput}
                placeholder="Nome Playlist *"
                placeholderTextColor={theme.colors.textMuted}
                value={nome}
                onChangeText={setNome}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSavePlaylist}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {editingPlaylist ? 'Salva Modifiche' : 'Crea Playlist'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  notLoggedContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  notLoggedContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  notLoggedMessage: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
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
    gap: 4,
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
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  coverWrapper: {
    marginRight: 14,
  },
  playlistCover: {
    width: 58,
    height: 58,
    borderRadius: 8,
  },
  playlistCoverPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  playlistOwner: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  actionBtn: {
    padding: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-start',
    paddingTop: 56,
    paddingHorizontal: theme.spacing.md,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: '78%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalScroll: {
    marginBottom: 10,
  },
  modalCoverPicker: {
    height: 140,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  modalCoverPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalCoverPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  modalCoverText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  modalInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginBottom: theme.spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: theme.colors.surfaceHighlight,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  detailContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  detailBody: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
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
  detailScrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 120,
  },
  detailHeroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  detailCover: {
    width: 200,
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  detailCoverPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  detailOwner: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  detailTracksSection: {
    marginTop: 20,
  },
  detailTracksHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: 8,
  },
  playAllText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  detailTracksCount: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  detailNoTracksBox: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  detailNoTracksText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  detailTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  detailTrackNumber: {
    width: 26,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  detailTrackThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 10,
  },
  detailTrackThumbPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  detailTrackInfo: {
    flex: 1,
  },
  detailTrackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  detailTrackArtist: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
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
