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
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { playlistApi, uploadApi, getMediaUrl, Playlist } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { useAudio } from '../services/AudioContext';
import { theme } from '../services/theme';

export function PlaylistsScreen() {
  const { user, isLoggedIn } = useAuth();
  const { activeSong } = useAudio();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

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
        Alert.alert('Errore', 'Impossibile caricare la copertina');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSavePlaylist = async () => {
    if (!nome.trim()) {
      Alert.alert('Attenzione', 'Inserisci un nome per la playlist');
      return;
    }

    if (!user) {
      Alert.alert('Errore', 'Devi essere autenticato');
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
        Alert.alert('Successo', 'Playlist aggiornata con successo');
      } else {
        const created = await playlistApi.create({
          nome: nome.trim(),
          urlImmagine: urlImmagine || undefined,
          utenteId: user.id,
        });
        setPlaylists(prev => [created, ...prev]);
        Alert.alert('Successo', 'Playlist creata con successo');
      }

      setModalVisible(false);
      setEditingPlaylist(null);
      setNome('');
      setUrlImmagine('');
    } catch (error) {
      Alert.alert('Errore', editingPlaylist ? 'Impossibile aggiornare la playlist' : 'Impossibile creare la playlist');
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

  const renderPlaylist = ({ item }: { item: Playlist }) => (
    <View style={styles.playlistCard}>
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

      {/* Modal Add/Edit Playlist */}
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
                {editingPlaylist ? 'Modifica Playlist' : 'Crea Nuova Playlist'}
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: '85%',
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
});
