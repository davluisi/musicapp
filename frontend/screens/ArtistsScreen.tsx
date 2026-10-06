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
  ActivityIndicator,
  Image,
  RefreshControl,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { artistApi, albumApi, songApi, uploadApi, getMediaUrl, Artist, Album, Song } from '../services/api';
import { useAudio } from '../services/AudioContext';
import { theme } from '../services/theme';

export function ArtistsScreen() {
  const { activeSong, isPlaying, togglePlaySong, openSongDetail } = useAudio();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Artist Detail Modal and Options
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedArtistDetails, setSelectedArtistDetails] = useState<Artist | null>(null);
  const [artistOptionsVisible, setArtistOptionsVisible] = useState(false);
  const [artistForOptions, setArtistForOptions] = useState<Artist | null>(null);

  // Form states
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [nome, setNome] = useState('');
  const [urlImmagine, setUrlImmagine] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const openAddModal = () => {
    setEditingArtist(null);
    setNome('');
    setUrlImmagine('');
    setModalVisible(true);
  };

  const openEditModal = (artist: Artist) => {
    setEditingArtist(artist);
    setNome(artist.nome || '');
    setUrlImmagine(artist.urlImmagine || '');
    setModalVisible(true);
  };

  const handleSaveArtist = async () => {
    if (!nome.trim()) {
      Alert.alert('Attenzione', 'Il nome dell\'artista è obbligatorio');
      return;
    }

    setSubmitting(true);
    try {
      if (editingArtist) {
        const updated = await artistApi.update(editingArtist.id, {
          nome: nome.trim(),
          urlImmagine: urlImmagine || undefined,
        });
        setArtists(prev => prev.map(a => a.id === editingArtist.id ? updated : a));
        Alert.alert('Successo', 'Artista aggiornato con successo');
      } else {
        const newArtist = await artistApi.create({
          nome: nome.trim(),
          urlImmagine: urlImmagine || undefined,
        });
        setArtists(prev => [newArtist, ...prev]);
        Alert.alert('Successo', 'Artista aggiunto con successo');
      }
      setModalVisible(false);
      setEditingArtist(null);
      setNome('');
      setUrlImmagine('');
    } catch (error) {
      Alert.alert('Errore', editingArtist ? 'Impossibile modificare l\'artista' : 'Impossibile aggiungere l\'artista');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    loadArtists();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadArtists();
    }, [])
  );

  const loadArtists = async () => {
    try {
      setLoading(true);
      const [artistsData, albumsData, songsData] = await Promise.all([
        artistApi.getAll(),
        albumApi.getAll(),
        songApi.getAll(),
      ]);
      setArtists(artistsData);
      setAlbums(albumsData);
      setSongs(songsData);
    } catch (error) {
      console.error('Error fetching artists', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadArtists();
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
          file = new File([blob], 'artist.jpg', { type: asset.mimeType || 'image/jpeg' });
        } else {
          file = {
            uri: asset.uri,
            name: asset.fileName || 'artist.jpg',
            type: asset.mimeType || 'image/jpeg',
          };
        }

        const uploadedUrl = await uploadApi.uploadImage('artista', file);
        setUrlImmagine(uploadedUrl);
      } catch (error) {
        Alert.alert('Errore', 'Impossibile caricare l\'immagine');
      } finally {
        setUploading(false);
      }
    }
  };

  const confirmDeleteArtist = (artist: Artist) => {
    Alert.alert(
      'Elimina Artista',
      `Sei sicuro di voler eliminare l'artista "${artist.nome}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await artistApi.delete(artist.id);
              setArtists(prev => prev.filter(a => a.id !== artist.id));
              setDetailModalVisible(false);
              setArtistOptionsVisible(false);
              Alert.alert('Successo', 'Artista eliminato con successo');
            } catch (err) {
              console.error('Delete artist error:', err);
              Alert.alert('Errore', 'Impossibile eliminare l\'artista');
            }
          },
        },
      ]
    );
  };

  const openArtistDetail = (artist: Artist) => {
    setSelectedArtistDetails(artist);
    setDetailModalVisible(true);
  };

  const filteredArtists = artists.filter(a => {
    return a.nome.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Albums and singles for the selected artist
  const artistAlbums = selectedArtistDetails
    ? albums.filter(alb => alb.artisti?.some(a => a.id === selectedArtistDetails.id))
    : [];

  const artistSingles = selectedArtistDetails
    ? songs.filter(s => !s.album && s.artisti?.some(a => a.id === selectedArtistDetails.id))
    : [];

  const renderArtist = ({ item }: { item: Artist }) => (
    <TouchableOpacity
      style={styles.artistCard}
      onPress={() => openArtistDetail(item)}
      activeOpacity={0.8}
    >
      <View style={styles.avatarContainer}>
        {item.urlImmagine ? (
          <Image source={{ uri: getMediaUrl(item.urlImmagine) }} style={styles.artistImage} />
        ) : (
          <View style={styles.artistImagePlaceholder}>
            <Ionicons name="person" size={28} color={theme.colors.textMuted} />
          </View>
        )}
      </View>
      <View style={styles.artistInfo}>
        <Text style={styles.artistName} numberOfLines={1}>
          {item.nome}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Info & Action */}
      <View style={styles.header}>
        <Text style={styles.subtitle}>{artists.length} disponibili</Text>
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
          placeholder="Cerca artista..."
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
          <Text style={styles.loadingText}>Caricamento artisti...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredArtists}
          renderItem={renderArtist}
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
              <Ionicons name="people-outline" size={64} color={theme.colors.surfaceBorder} />
              <Text style={styles.emptyTitle}>Nessun artista trovato</Text>
              <Text style={styles.emptySubtitle}>
                Aggiungi nuovi artisti toccando il pulsante in alto a destra
              </Text>
            </View>
          }
        />
      )}

      {/* FULL SCREEN / DETAILED ARTIST MODAL */}
      <Modal
        visible={detailModalVisible && !!selectedArtistDetails}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        {selectedArtistDetails && (
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
                Artista
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setArtistForOptions(selectedArtistDetails);
                  setArtistOptionsVisible(true);
                }}
                style={styles.detailHeaderBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
              {/* Large Artist Photo and Name */}
              <View style={styles.detailHeroSection}>
                {selectedArtistDetails.urlImmagine ? (
                  <Image
                    source={{ uri: getMediaUrl(selectedArtistDetails.urlImmagine) }}
                    style={styles.detailArtistAvatar}
                  />
                ) : (
                  <View style={styles.detailArtistAvatarPlaceholder}>
                    <Ionicons name="person" size={80} color={theme.colors.textMuted} />
                  </View>
                )}
                <Text style={styles.detailArtistName}>{selectedArtistDetails.nome}</Text>
              </View>

              {/* Albums Section */}
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeaderRow}>
                  <Text style={styles.detailSectionTitle}>Album</Text>
                  <Text style={styles.detailSectionCount}>{artistAlbums.length}</Text>
                </View>

                {artistAlbums.length === 0 ? (
                  <Text style={styles.detailEmptyText}>Nessun album per questo artista</Text>
                ) : (
                  artistAlbums.map(alb => (
                    <View key={alb.id} style={styles.detailItemRow}>
                      {alb.urlImmagine ? (
                        <Image source={{ uri: getMediaUrl(alb.urlImmagine) }} style={styles.detailItemThumb} />
                      ) : (
                        <View style={styles.detailItemThumbPlaceholder}>
                          <Ionicons name="disc" size={20} color={theme.colors.textMuted} />
                        </View>
                      )}
                      <View style={styles.detailItemInfo}>
                        <Text style={styles.detailItemTitle} numberOfLines={1}>
                          {alb.nome}
                        </Text>
                        <Text style={styles.detailItemSubtitle}>
                          {alb.anno ? `Anno ${alb.anno}` : 'Album'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Singles / Songs without Album Section */}
              <View style={[styles.detailSection, { marginTop: 24 }]}>
                <View style={styles.detailSectionHeaderRow}>
                  <Text style={styles.detailSectionTitle}>Canzoni senza album</Text>
                  <Text style={styles.detailSectionCount}>{artistSingles.length}</Text>
                </View>

                {artistSingles.length === 0 ? (
                  <Text style={styles.detailEmptyText}>Nessun singolo o canzone indipendente</Text>
                ) : (
                  artistSingles.map(song => {
                    const isThisPlaying = activeSong?.id === song.id && isPlaying;
                    return (
                      <TouchableOpacity
                        key={song.id}
                        style={styles.detailItemRow}
                        onPress={() => togglePlaySong(song, true)}
                        activeOpacity={0.7}
                      >
                        {song.urlImmagine ? (
                          <Image source={{ uri: getMediaUrl(song.urlImmagine) }} style={styles.detailItemThumb} />
                        ) : (
                          <View style={styles.detailItemThumbPlaceholder}>
                            <Ionicons name="musical-note" size={20} color={theme.colors.textMuted} />
                          </View>
                        )}
                        <View style={styles.detailItemInfo}>
                          <Text
                            style={[styles.detailItemTitle, activeSong?.id === song.id && { color: theme.colors.primary }]}
                            numberOfLines={1}
                          >
                            {song.nome || 'Traccia Audio'}
                          </Text>
                          <Text style={styles.detailItemSubtitle}>
                            {song.anno ? `${song.anno} • Singolo` : 'Singolo'}
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

      {/* 3 DOTS ARTIST OPTIONS POPUP MODAL */}
      <Modal
        visible={artistOptionsVisible && !!artistForOptions}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setArtistOptionsVisible(false)}
      >
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setArtistOptionsVisible(false)}
        >
          <View style={styles.optionsContent}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle} numberOfLines={1}>
                {artistForOptions?.nome}
              </Text>
              <Text style={styles.optionsSubtitle} numberOfLines={1}>
                Opzioni artista
              </Text>
            </View>

            {/* Option: Modifica */}
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                if (artistForOptions) {
                  setArtistOptionsVisible(false);
                  openEditModal(artistForOptions);
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
                if (artistForOptions) {
                  confirmDeleteArtist(artistForOptions);
                }
              }}
            >
              <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
              <Text style={[styles.optionRowText, styles.optionRowTextDestructive]}>Elimina</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCancelBtn}
              onPress={() => setArtistOptionsVisible(false)}
            >
              <Text style={styles.optionCancelText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Add/Edit Artist */}
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
                {editingArtist ? 'Modifica Artista' : 'Aggiungi Artista'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Image picker */}
            <TouchableOpacity
              style={styles.modalImagePicker}
              onPress={pickImage}
              disabled={uploading}
            >
              {urlImmagine ? (
                <Image source={{ uri: getMediaUrl(urlImmagine) }} style={styles.modalImagePreview} />
              ) : (
                <View style={styles.modalImagePlaceholder}>
                  <Ionicons name="camera-outline" size={28} color={theme.colors.textSecondary} />
                  <Text style={styles.modalImageText}>
                    {uploading ? 'Caricamento...' : 'Seleziona Foto'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <TextInput
                style={styles.modalInput}
                placeholder="Nome Artista *"
                placeholderTextColor={theme.colors.textMuted}
                value={nome}
                onChangeText={setNome}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveArtist}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingArtist ? 'Salva Modifiche' : 'Salva Artista'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
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
  artistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  avatarContainer: {
    marginRight: 14,
  },
  artistImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  artistImagePlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  artistRole: {
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
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
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
  modalImagePicker: {
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalImagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.surfaceHighlight,
    borderWidth: 2,
    borderColor: theme.colors.surfaceBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  modalImagePreview: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  modalImageText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 12,
    marginBottom: theme.spacing.xl,
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
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
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
  /* Artist Detail Full Modal Styles */
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
    paddingVertical: 26,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  detailArtistAvatar: {
    width: 170,
    height: 170,
    borderRadius: 85,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  detailArtistAvatarPlaceholder: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.colors.surfaceBorder,
  },
  detailArtistName: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },
  detailSection: {
    marginTop: 20,
  },
  detailSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  detailSectionCount: {
    fontSize: 13,
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.surfaceHighlight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  detailEmptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  detailItemThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
  },
  detailItemThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailItemInfo: {
    flex: 1,
  },
  detailItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  detailItemSubtitle: {
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

