import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
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
import { albumApi, artistApi, songApi, uploadApi, getMediaUrl, Album, Artist, Song } from '../services/api';
import { useAudio } from '../services/AudioContext';
import { theme } from '../services/theme';

export function AlbumsScreen() {
  const { activeSong, isPlaying, togglePlaySong, playQueue, handleMiniPlayerToggle, openSongDetail } = useAudio();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Album Detail Modal and Options
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedAlbumDetails, setSelectedAlbumDetails] = useState<Album | null>(null);
  const [albumOptionsVisible, setAlbumOptionsVisible] = useState(false);
  const [albumForOptions, setAlbumForOptions] = useState<Album | null>(null);

  // Form states
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [nome, setNome] = useState('');
  const [anno, setAnno] = useState('');
  const [urlImmagine, setUrlImmagine] = useState('');
  const [selectedArtists, setSelectedArtists] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const openAddModal = () => {
    setEditingAlbum(null);
    setNome('');
    setAnno('');
    setUrlImmagine('');
    setSelectedArtists([]);
    setModalVisible(true);
  };

  const openEditModal = (album: Album) => {
    setEditingAlbum(album);
    setNome(album.nome || '');
    setAnno(album.anno != null ? String(album.anno) : '');
    setUrlImmagine(album.urlImmagine || '');
    setSelectedArtists(album.artisti ? album.artisti.map(a => a.id) : []);
    setModalVisible(true);
  };

  const handleSaveAlbum = async () => {
    if (!nome.trim()) {
      Alert.alert('Attenzione', 'Il titolo dell\'album è obbligatorio');
      return;
    }

    setSubmitting(true);
    try {
      const selectedArtistObjects = artists.filter(a => selectedArtists.includes(a.id));

      if (editingAlbum) {
        const updated = await albumApi.update(editingAlbum.id, {
          nome: nome.trim(),
          anno: anno ? Number(anno) : undefined,
          urlImmagine: urlImmagine || undefined,
          artisti: selectedArtistObjects,
        });
        setAlbums(prev => prev.map(alb => alb.id === editingAlbum.id ? updated : alb));
        Alert.alert('Successo', 'Album aggiornato con successo');
      } else {
        const newAlbum = await albumApi.create({
          nome: nome.trim(),
          anno: anno ? Number(anno) : undefined,
          urlImmagine: urlImmagine || undefined,
          artisti: selectedArtistObjects,
        });
        setAlbums(prev => [newAlbum, ...prev]);
        Alert.alert('Successo', 'Album creato con successo');
      }

      setModalVisible(false);
      setEditingAlbum(null);
      setNome('');
      setAnno('');
      setUrlImmagine('');
      setSelectedArtists([]);
    } catch (error) {
      Alert.alert('Errore', editingAlbum ? 'Impossibile modificare l\'album' : 'Impossibile salvare l\'album');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [albumsData, artistsData, songsData] = await Promise.all([
        albumApi.getAll(),
        artistApi.getAll(),
        songApi.getAll(),
      ]);
      setAlbums(albumsData);
      setArtists(artistsData);
      setSongs(songsData);
    } catch (error) {
      console.error('Error fetching albums', error);
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
      setUploading(true);
      try {
        const asset = result.assets[0];
        let file: any;

        if (Platform.OS === 'web') {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          file = new File([blob], 'album.jpg', { type: asset.mimeType || 'image/jpeg' });
        } else {
          file = {
            uri: asset.uri,
            name: asset.fileName || 'album.jpg',
            type: asset.mimeType || 'image/jpeg',
          };
        }

        const uploadedUrl = await uploadApi.uploadImage('album', file);
        setUrlImmagine(uploadedUrl);
      } catch (error) {
        Alert.alert('Errore', 'Impossibile caricare la copertina');
      } finally {
        setUploading(false);
      }
    }
  };

  const toggleArtist = (artistId: number) => {
    setSelectedArtists(prev =>
      prev.includes(artistId)
        ? prev.filter(id => id !== artistId)
        : [...prev, artistId]
    );
  };

  const confirmDeleteAlbum = (album: Album) => {
    Alert.alert(
      'Elimina Album',
      `Sei sicuro di voler eliminare l'album "${album.nome}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await albumApi.delete(album.id);
              setAlbums(prev => prev.filter(a => a.id !== album.id));
              setDetailModalVisible(false);
              setAlbumOptionsVisible(false);
              Alert.alert('Successo', 'Album eliminato con successo');
            } catch (err) {
              console.error('Delete album error:', err);
              Alert.alert('Errore', 'Impossibile eliminare l\'album');
            }
          },
        },
      ]
    );
  };

  const openAlbumDetail = (album: Album) => {
    setSelectedAlbumDetails(album);
    setDetailModalVisible(true);
  };

  const filteredAlbums = albums.filter(alb => {
    const nameMatch = alb.nome.toLowerCase().includes(searchQuery.toLowerCase());
    const artistMatch = alb.artisti?.some(a =>
      a.nome.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return nameMatch || artistMatch;
  });

  const albumSongs = selectedAlbumDetails
    ? songs.filter(s => s.album?.id === selectedAlbumDetails.id)
    : [];

  const renderAlbum = ({ item }: { item: Album }) => (
    <TouchableOpacity
      style={styles.albumCard}
      onPress={() => openAlbumDetail(item)}
      activeOpacity={0.8}
    >
      <View style={styles.coverWrapper}>
        {item.urlImmagine ? (
          <Image source={{ uri: getMediaUrl(item.urlImmagine) }} style={styles.albumCover} />
        ) : (
          <View style={styles.albumCoverPlaceholder}>
            <Ionicons name="disc" size={32} color={theme.colors.textMuted} />
          </View>
        )}
      </View>
      <View style={styles.albumInfo}>
        <Text style={styles.albumTitle} numberOfLines={1}>
          {item.nome}
        </Text>
        <Text style={styles.albumArtists} numberOfLines={1}>
          {item.artisti && item.artisti.length > 0
            ? item.artisti.map(a => a.nome).join(', ')
            : 'Vari Artisti'}
        </Text>
        {item.anno && (
          <View style={styles.yearTag}>
            <Text style={styles.yearText}>{item.anno}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Info & Action */}
      <View style={styles.header}>
        <Text style={styles.subtitle}>{albums.length} disponibili</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#000" />
          <Text style={styles.addButtonText}>Nuovo</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca album o artista..."
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
          <Text style={styles.loadingText}>Caricamento album...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAlbums}
          renderItem={renderAlbum}
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
              <Ionicons name="albums-outline" size={64} color={theme.colors.surfaceBorder} />
              <Text style={styles.emptyTitle}>Nessun album trovato</Text>
              <Text style={styles.emptySubtitle}>Crea un nuovo album con copertina e artisti</Text>
            </View>
          }
        />
      )}

      {/* FULL SCREEN / DETAILED ALBUM MODAL */}
      <Modal
        visible={detailModalVisible && !!selectedAlbumDetails}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        {selectedAlbumDetails && (
          <SafeAreaView style={styles.detailContainer} edges={['top', 'bottom', 'left', 'right']}>
            {/* Header: Back and 3 Dots */}
            <View style={styles.detailHeader}>
              <TouchableOpacity
                onPress={() => setDetailModalVisible(false)}
                style={styles.detailHeaderBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="chevron-down" size={28} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle} numberOfLines={1}>
                Album
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setAlbumForOptions(selectedAlbumDetails);
                  setAlbumOptionsVisible(true);
                }}
                style={styles.detailHeaderBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
              {/* Album Hero Info */}
              <View style={styles.detailHeroSection}>
                {selectedAlbumDetails.urlImmagine ? (
                  <Image
                    source={{ uri: getMediaUrl(selectedAlbumDetails.urlImmagine) }}
                    style={styles.detailAlbumCover}
                  />
                ) : (
                  <View style={styles.detailAlbumCoverPlaceholder}>
                    <Ionicons name="disc" size={64} color={theme.colors.textMuted} />
                  </View>
                )}
                <Text style={styles.detailAlbumTitle}>{selectedAlbumDetails.nome}</Text>
                <Text style={styles.detailAlbumArtists}>
                  {selectedAlbumDetails.artisti && selectedAlbumDetails.artisti.length > 0
                    ? selectedAlbumDetails.artisti.map(a => a.nome).join(', ')
                    : 'Vari Artisti'}
                </Text>
                {selectedAlbumDetails.anno && (
                  <Text style={styles.detailAlbumYear}>Anno di pubblicazione: {selectedAlbumDetails.anno}</Text>
                )}
              </View>

              {/* Tracks Section */}
              <View style={styles.detailTracksSection}>
                <View style={styles.detailTracksHeaderRow}>
                  <TouchableOpacity
                    style={[styles.albumPlayAllButton, albumSongs.length === 0 && { opacity: 0.5 }]}
                    onPress={() => {
                      if (albumSongs.length === 0) return;
                      const isCurrentAlbumPlaying = selectedAlbumDetails && activeSong?.album?.id === selectedAlbumDetails.id && isPlaying;
                      if (isCurrentAlbumPlaying) {
                        handleMiniPlayerToggle();
                      } else {
                        playQueue(albumSongs, 0);
                      }
                    }}
                    activeOpacity={0.8}
                    disabled={albumSongs.length === 0}
                  >
                    <Ionicons
                      name={
                        selectedAlbumDetails && activeSong?.album?.id === selectedAlbumDetails.id && isPlaying
                          ? 'pause-circle'
                          : 'play-circle'
                      }
                      size={28}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.albumPlayAllText}>
                      {selectedAlbumDetails && activeSong?.album?.id === selectedAlbumDetails.id && isPlaying
                        ? 'Pausa'
                        : 'Riproduci brani'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.detailTracksCount}>{albumSongs.length} brani</Text>
                </View>

                {albumSongs.length === 0 ? (
                  <View style={styles.detailNoTracksBox}>
                    <Ionicons name="musical-notes-outline" size={32} color={theme.colors.textMuted} />
                    <Text style={styles.detailNoTracksText}>Nessuna canzone associata a questo album</Text>
                  </View>
                ) : (
                  albumSongs.map((song, index) => {
                    const isThisPlaying = activeSong?.id === song.id && isPlaying;
                    return (
                      <TouchableOpacity
                        key={song.id}
                        style={styles.detailTrackRow}
                        onPress={() => {
                          if (isThisPlaying) {
                            handleMiniPlayerToggle();
                          } else {
                            playQueue(albumSongs, index);
                          }
                        }}
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
                        <Ionicons
                          name={isThisPlaying ? 'pause-circle' : 'play-circle'}
                          size={28}
                          color={theme.colors.primary}
                        />
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* 3 DOTS ALBUM OPTIONS POPUP MODAL */}
      <Modal
        visible={albumOptionsVisible && !!albumForOptions}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setAlbumOptionsVisible(false)}
      >
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setAlbumOptionsVisible(false)}
        >
          <View style={styles.optionsContent}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle} numberOfLines={1}>
                {albumForOptions?.nome}
              </Text>
              <Text style={styles.optionsSubtitle} numberOfLines={1}>
                {albumForOptions?.artisti && albumForOptions.artisti.length > 0
                  ? albumForOptions.artisti.map(a => a.nome).join(', ')
                  : 'Opzioni album'}
              </Text>
            </View>

            {/* Option: Modifica */}
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                if (albumForOptions) {
                  setAlbumOptionsVisible(false);
                  openEditModal(albumForOptions);
                }
              }}
            >
              <Ionicons name="pencil-outline" size={22} color={theme.colors.text} />
              <Text style={styles.optionRowText}>Modifica</Text>
            </TouchableOpacity>

            {/* Option: Elimina */}
            <TouchableOpacity
              style={[styles.optionRow, styles.optionRowDestructive]}
              onPress={() => {
                if (albumForOptions) {
                  confirmDeleteAlbum(albumForOptions);
                }
              }}
            >
              <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
              <Text style={[styles.optionRowText, styles.optionRowTextDestructive]}>Elimina</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCancelBtn}
              onPress={() => setAlbumOptionsVisible(false)}
            >
              <Text style={styles.optionCancelText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Add/Edit Album */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAlbum ? 'Modifica Album' : 'Crea Nuovo Album'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
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
                      {uploading ? 'Caricamento...' : 'Carica Copertina Album'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Titolo Album *"
                  placeholderTextColor={theme.colors.textMuted}
                  value={nome}
                  onChangeText={setNome}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Anno di pubblicazione (es. 2024)"
                  placeholderTextColor={theme.colors.textMuted}
                  value={anno}
                  onChangeText={setAnno}
                  keyboardType="numeric"
                />
              </View>

              <Text style={styles.sectionHeader}>Seleziona Artisti</Text>
              {artists.length === 0 ? (
                <Text style={styles.noArtistsText}>Nessun artista creato finora.</Text>
              ) : (
                <View style={styles.artistListGrid}>
                  {artists.map(artist => {
                    const isSelected = selectedArtists.includes(artist.id);
                    return (
                      <TouchableOpacity
                        key={artist.id}
                        style={[
                          styles.artistBadge,
                          isSelected && styles.artistBadgeSelected,
                        ]}
                        onPress={() => toggleArtist(artist.id)}
                      >
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={18}
                          color={isSelected ? '#000' : theme.colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.artistBadgeText,
                            isSelected && styles.artistBadgeTextSelected,
                          ]}
                        >
                          {artist.nome}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveAlbum}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {editingAlbum ? 'Salva Modifiche' : 'Crea Album'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  albumCard: {
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
  albumCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  albumCoverPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  albumInfo: {
    flex: 1,
  },
  albumTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  albumArtists: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  yearTag: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceHighlight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 5,
  },
  yearText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
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
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    maxHeight: '85%',
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
  modalCoverPicker: {
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalCoverPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceHighlight,
    borderWidth: 2,
    borderColor: theme.colors.surfaceBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    padding: 10,
  },
  modalCoverPreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  modalCoverText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputGroup: {
    gap: 12,
    marginBottom: theme.spacing.lg,
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
  },
  sectionHeader: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  noArtistsText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: 16,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    fontSize: 13,
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
  /* Album Detail Full Modal Styles */
  detailContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    paddingBottom: 40,
  },
  detailHeroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  detailAlbumCover: {
    width: 200,
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  detailAlbumCoverPlaceholder: {
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
  detailAlbumTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  detailAlbumArtists: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  detailAlbumYear: {
    fontSize: 12,
    color: theme.colors.textMuted,
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
  albumPlayAllButton: {
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
  albumPlayAllText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  detailTracksTitle: {
    fontSize: 17,
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

