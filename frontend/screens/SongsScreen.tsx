import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity, Modal, Alert, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { songApi, artistApi, albumApi, uploadApi, Song, Artist, Album } from '../services/api';

export function SongsScreen() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [anno, setAnno] = useState('');
  const [urlImmagine, setUrlImmagine] = useState('');
  const [urlFileAudio, setUrlFileAudio] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<number | null>(null);
  const [selectedArtists, setSelectedArtists] = useState<number[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [downloadingAudio, setDownloadingAudio] = useState(false);

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
      setUploadingImage(true);
      try {
        const uri = result.assets[0].uri;
        const response = await fetch(uri);
        const blob = await response.blob();
        const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
        
        const uploadedUrl = await uploadApi.uploadImage('canzone', file);
        setUrlImmagine(uploadedUrl);
      } catch (error) {
        Alert.alert('Error', 'Impossibile caricare l\'immagine');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const downloadFromYouTube = async () => {
    if (!youtubeUrl) {
      Alert.alert('Error', 'Inserisci un link YouTube valido');
      return;
    }

    setDownloadingAudio(true);
    try {
      const uploadedUrl = await uploadApi.downloadFromYouTube(youtubeUrl);
      setUrlFileAudio(uploadedUrl);
      setYoutubeUrl('');
    } catch (error) {
      Alert.alert('Error', 'Impossibile scaricare l\'audio da YouTube');
    } finally {
      setDownloadingAudio(false);
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
      const [songsData, artistsData, albumsData] = await Promise.all([
        songApi.getAll(),
        artistApi.getAll(),
        albumApi.getAll(),
      ]);
      setSongs(songsData);
      setArtists(artistsData);
      setAlbums(albumsData);
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

  const handleAddSong = async () => {
    if (!urlFileAudio) {
      Alert.alert('Error', 'L\'URL del file audio è obbligatorio');
      return;
    }

    try {
      const selectedArtistObjects = artists.filter(a => selectedArtists.includes(a.id));
      const selectedAlbumObject = selectedAlbum ? albums.find(a => a.id === selectedAlbum) : undefined;

      const newSong = await songApi.create({
        urlFileAudio: urlFileAudio || 'placeholder.mp3',
        anno: anno ? Number(anno) : undefined,
        urlImmagine: urlImmagine || undefined,
        album: selectedAlbumObject || undefined,
        artisti: selectedArtistObjects,
      });

      setSongs([...songs, newSong]);
      setModalVisible(false);
      setAnno('');
      setUrlImmagine('');
      setUrlFileAudio('');
      setSelectedAlbum(null);
      setSelectedArtists([]);
      Alert.alert('Success', 'Canzone aggiunta con successo');
    } catch (error) {
      Alert.alert('Error', 'Impossibile aggiungere la canzone');
    }
  };

  const renderSong = ({ item }: { item: Song }) => (
    <View style={styles.songItem}>
      {item.urlImmagine && (
        <Image source={{ uri: item.urlImmagine }} style={styles.songImagePreview} />
      )}
      <View style={styles.songInfo}>
        <Text style={styles.songName}>{item.urlFileAudio}</Text>
        {item.anno != null && <Text style={styles.songYear}>{String(item.anno)}</Text>}
        {item.album && <Text style={styles.songAlbum}>Album: {item.album.nome}</Text>}
        {item.artisti && item.artisti.length > 0 && (
          <Text style={styles.songArtists}>
            Artisti: {item.artisti.map(a => `${a.nome} ${a.cognome}`).join(', ')}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Canzoni</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Aggiungi</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loading} />
      ) : (
        <FlatList
          data={songs}
          renderItem={renderSong}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nessuna canzone presente</Text>
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
            <Text style={styles.modalTitle}>Nuova Canzone</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Link YouTube *"
              value={youtubeUrl}
              onChangeText={setYoutubeUrl}
            />
            <TouchableOpacity style={styles.imageUploadButton} onPress={downloadFromYouTube} disabled={downloadingAudio}>
              <Text style={styles.imageUploadButtonText}>
                {downloadingAudio ? 'Download in corso...' : 'Scarica audio da YouTube'}
              </Text>
            </TouchableOpacity>
            {urlFileAudio && (
              <Text style={styles.fileUploadedText}>Audio scaricato con successo!</Text>
            )}
            
            <TextInput
              style={styles.input}
              placeholder="Anno (opzionale)"
              value={anno}
              onChangeText={setAnno}
              keyboardType="numeric"
            />
            
            <TouchableOpacity style={styles.imageUploadButton} onPress={pickImage} disabled={uploadingImage}>
              <Text style={styles.imageUploadButtonText}>
                {uploadingImage ? 'Caricamento...' : urlImmagine ? 'Cambia immagine' : 'Carica immagine'}
              </Text>
            </TouchableOpacity>
            {urlImmagine && (
              <Image source={{ uri: urlImmagine }} style={styles.previewImage} />
            )}

            <Text style={styles.sectionTitle}>Seleziona Album (opzionale):</Text>
            <TouchableOpacity
              style={[
                styles.albumOption,
                selectedAlbum === null && styles.albumOptionSelected,
              ]}
              onPress={() => setSelectedAlbum(null)}
            >
              <Text style={styles.albumOptionText}>Nessun album</Text>
              <Text style={styles.checkboxIndicator}>
                {selectedAlbum === null ? '✓' : ''}
              </Text>
            </TouchableOpacity>
            {albums.map(album => (
              <TouchableOpacity
                key={album.id}
                style={[
                  styles.albumOption,
                  selectedAlbum === album.id && styles.albumOptionSelected,
                ]}
                onPress={() => setSelectedAlbum(album.id)}
              >
                <Text style={styles.albumOptionText}>{album.nome}</Text>
                <Text style={styles.checkboxIndicator}>
                  {selectedAlbum === album.id ? '✓' : ''}
                </Text>
              </TouchableOpacity>
            ))}

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
              <Button title="Salva" onPress={handleAddSong} />
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
  songItem: {
    padding: 16,
    backgroundColor: '#181818',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#282828',
  },
  songImagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#282828',
  },
  songInfo: {
    flex: 1,
  },
  songName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  songYear: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  songAlbum: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  songArtists: {
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
  fileUploadedText: {
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: 'bold',
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
  albumOption: {
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
  albumOptionSelected: {
    backgroundColor: '#1DB954',
    borderColor: '#1DB954',
  },
  albumOptionText: {
    fontSize: 16,
    color: '#fff',
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
