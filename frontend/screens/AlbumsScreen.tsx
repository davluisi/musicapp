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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { albumApi, artistApi, uploadApi, Album, Artist } from '../services/api';
import { theme } from '../services/theme';

export function AlbumsScreen() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

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
      const [albumsData, artistsData] = await Promise.all([
        albumApi.getAll(),
        artistApi.getAll(),
      ]);
      setAlbums(albumsData);
      setArtists(artistsData);
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
        const uri = result.assets[0].uri;
        const response = await fetch(uri);
        const blob = await response.blob();
        const file = new File([blob], 'album.jpg', { type: 'image/jpeg' });

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

  const filteredAlbums = albums.filter(alb => {
    const nameMatch = alb.nome.toLowerCase().includes(searchQuery.toLowerCase());
    const artistMatch = alb.artisti?.some(a =>
      `${a.nome} ${a.cognome}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return nameMatch || artistMatch;
  });

  const renderAlbum = ({ item }: { item: Album }) => (
    <View style={styles.albumCard}>
      <View style={styles.coverWrapper}>
        {item.urlImmagine ? (
          <Image source={{ uri: item.urlImmagine }} style={styles.albumCover} />
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
            ? item.artisti.map(a => `${a.nome} ${a.cognome}`).join(', ')
            : 'Vari Artisti'}
        </Text>
        {item.anno && (
          <View style={styles.yearTag}>
            <Text style={styles.yearText}>{item.anno}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => openEditModal(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="pencil-outline" size={20} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
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
          contentContainerStyle={styles.listContent}
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

      {/* Modal Add/Edit Album */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
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
                  <Image source={{ uri: urlImmagine }} style={styles.modalCoverPreview} />
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
                          {artist.nome} {artist.cognome}
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
});
