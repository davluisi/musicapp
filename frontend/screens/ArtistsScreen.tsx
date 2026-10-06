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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { artistApi, uploadApi, Artist } from '../services/api';
import { theme } from '../services/theme';

export function ArtistsScreen() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Form states
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [urlImmagine, setUrlImmagine] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const openAddModal = () => {
    setEditingArtist(null);
    setNome('');
    setCognome('');
    setUrlImmagine('');
    setModalVisible(true);
  };

  const openEditModal = (artist: Artist) => {
    setEditingArtist(artist);
    setNome(artist.nome || '');
    setCognome(artist.cognome || '');
    setUrlImmagine(artist.urlImmagine || '');
    setModalVisible(true);
  };

  const handleSaveArtist = async () => {
    if (!nome.trim() || !cognome.trim()) {
      Alert.alert('Attenzione', 'Nome e cognome sono obbligatori');
      return;
    }

    setSubmitting(true);
    try {
      if (editingArtist) {
        const updated = await artistApi.update(editingArtist.id, {
          nome: nome.trim(),
          cognome: cognome.trim(),
          urlImmagine: urlImmagine || undefined,
        });
        setArtists(prev => prev.map(a => a.id === editingArtist.id ? updated : a));
        Alert.alert('Successo', 'Artista aggiornato con successo');
      } else {
        const newArtist = await artistApi.create({
          nome: nome.trim(),
          cognome: cognome.trim(),
          urlImmagine: urlImmagine || undefined,
        });
        setArtists(prev => [newArtist, ...prev]);
        Alert.alert('Successo', 'Artista aggiunto con successo');
      }
      setModalVisible(false);
      setEditingArtist(null);
      setNome('');
      setCognome('');
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
      const data = await artistApi.getAll();
      setArtists(data);
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
        const uri = result.assets[0].uri;
        const response = await fetch(uri);
        const blob = await response.blob();
        const file = new File([blob], 'artist.jpg', { type: 'image/jpeg' });

        const uploadedUrl = await uploadApi.uploadImage('artista', file);
        setUrlImmagine(uploadedUrl);
      } catch (error) {
        Alert.alert('Errore', 'Impossibile caricare l\'immagine');
      } finally {
        setUploading(false);
      }
    }
  };

  const filteredArtists = artists.filter(a => {
    const full = `${a.nome} ${a.cognome}`.toLowerCase();
    return full.includes(searchQuery.toLowerCase());
  });

  const renderArtist = ({ item }: { item: Artist }) => (
    <View style={styles.artistCard}>
      <View style={styles.avatarContainer}>
        {item.urlImmagine ? (
          <Image source={{ uri: item.urlImmagine }} style={styles.artistImage} />
        ) : (
          <View style={styles.artistImagePlaceholder}>
            <Ionicons name="person" size={28} color={theme.colors.textMuted} />
          </View>
        )}
      </View>
      <View style={styles.artistInfo}>
        <Text style={styles.artistName} numberOfLines={1}>
          {item.nome} {item.cognome}
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
              <Ionicons name="people-outline" size={64} color={theme.colors.surfaceBorder} />
              <Text style={styles.emptyTitle}>Nessun artista trovato</Text>
              <Text style={styles.emptySubtitle}>
                Aggiungi nuovi artisti toccando il pulsante in alto a destra
              </Text>
            </View>
          }
        />
      )}

      {/* Modal Add/Edit Artist */}
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
                <Image source={{ uri: urlImmagine }} style={styles.modalImagePreview} />
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
                placeholder="Nome *"
                placeholderTextColor={theme.colors.textMuted}
                value={nome}
                onChangeText={setNome}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Cognome *"
                placeholderTextColor={theme.colors.textMuted}
                value={cognome}
                onChangeText={setCognome}
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
});
