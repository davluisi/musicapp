import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity, Modal, Alert, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { albumApi, artistApi, uploadApi, Album, Artist } from '../services/api';

export function AlbumsScreen() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [nome, setNome] = useState('');
  const [anno, setAnno] = useState('');
  const [urlImmagine, setUrlImmagine] = useState('');
  const [selectedArtists, setSelectedArtists] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleAnnoChange = (text: string) => {
    setAnno(text);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setUploading(true);
      try {
        const uri = result.assets[0].uri;
        const response = await fetch(uri);
        const blob = await response.blob();
        const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
        
        const uploadedUrl = await uploadApi.uploadImage('album', file);
        setUrlImmagine(uploadedUrl);
      } catch (error) {
        Alert.alert('Error', 'Impossibile caricare l\'immagine');
      } finally {
        setUploading(false);
      }
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
      Alert.alert('Error', 'Impossibile caricare i dati');
    } finally {
      setLoading(false);
    }
  };

  const toggleArtist = (artistId: number) => {
    setSelectedArtists(prev =>
      prev.includes(artistId)
        ? prev.filter(id => id !== artistId)
        : [...prev, artistId]
    );
  };

  const handleAddAlbum = async () => {
    if (!nome) {
      Alert.alert('Error', 'Il nome è obbligatorio');
      return;
    }

    try {
      const selectedArtistObjects = artists.filter(a => selectedArtists.includes(a.id));

      const newAlbum = await albumApi.create({
        nome,
        anno: anno ? Number(anno) : undefined,
        urlImmagine: urlImmagine || undefined,
        artisti: selectedArtistObjects,
      });

      setAlbums([...albums, newAlbum]);
      setModalVisible(false);
      setNome('');
      setAnno('');
      setUrlImmagine('');
      setSelectedArtists([]);
      Alert.alert('Success', 'Album aggiunto con successo');
    } catch (error) {
      Alert.alert('Error', 'Impossibile aggiungere l\'album');
    }
  };

  const renderAlbum = ({ item }: { item: Album }) => (
    <View style={styles.albumItem}>
      {item.urlImmagine && (
        <Image source={{ uri: item.urlImmagine }} style={styles.albumImage} />
      )}
      <View style={styles.albumInfo}>
        <Text style={styles.albumName}>{item.nome}</Text>
        {item.anno != null && <Text style={styles.albumYear}>{String(item.anno)}</Text>}
        {item.artisti && item.artisti.length > 0 && (
          <Text style={styles.albumArtists}>
            Artisti: {item.artisti.map(a => `${a.nome} ${a.cognome}`).join(', ')}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Album</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Aggiungi</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loading} />
      ) : (
        <FlatList
          data={albums}
          renderItem={renderAlbum}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nessun album presente</Text>
          }
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nuovo Album</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nome *"
              value={nome}
              onChangeText={setNome}
            />
            <TextInput
              style={styles.input}
              placeholder="Anno (opzionale)"
              value={anno}
              onChangeText={setAnno}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.imageUploadButton} onPress={pickImage} disabled={uploading}>
              <Text style={styles.imageUploadButtonText}>
                {uploading ? 'Caricamento...' : urlImmagine ? 'Cambia immagine' : 'Carica immagine'}
              </Text>
            </TouchableOpacity>
            {urlImmagine && (
              <Image source={{ uri: urlImmagine }} style={styles.previewImage} />
            )}

            <Text style={styles.sectionTitle}>Seleziona Artisti:</Text>
            {artists.map(artist => (
              <TouchableOpacity
                key={artist.id}
                style={[
                  styles.artistCheckbox,
                  selectedArtists.includes(artist.id) && styles.artistCheckboxSelected,
                ]}
                onPress={() => toggleArtist(artist.id)}
              >
                <Text style={styles.artistCheckboxText}>
                  {artist.nome} {artist.cognome}
                </Text>
                <Text style={styles.checkboxIndicator}>
                  {selectedArtists.includes(artist.id) ? '✓' : ''}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.modalButtons}>
              <Button title="Annulla" onPress={() => setModalVisible(false)} color="#999" />
              <Button title="Salva" onPress={handleAddAlbum} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  albumItem: {
    padding: 16,
    backgroundColor: '#181818',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#282828',
  },
  albumImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#282828',
  },
  albumInfo: {
    flex: 1,
  },
  albumName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  albumYear: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  albumArtists: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  imageUploadButton: {
    backgroundColor: '#1DB954',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  imageUploadButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 50,
    fontSize: 16,
  },
  loading: {
    marginTop: 50,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    padding: 24,
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    gap: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#fff',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#282828',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  artistCheckbox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#282828',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  artistCheckboxSelected: {
    backgroundColor: '#1DB954',
    borderColor: '#1DB954',
  },
  artistCheckboxText: {
    fontSize: 16,
    color: '#fff',
  },
  checkboxIndicator: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
});
