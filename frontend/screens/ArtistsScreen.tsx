import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity, Modal, Alert, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { artistApi, uploadApi, Artist } from '../services/api';

export function ArtistsScreen() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [urlImmagine, setUrlImmagine] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadArtists();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadArtists();
    }, [])
  );

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
        
        const uploadedUrl = await uploadApi.uploadImage('artista', file);
        setUrlImmagine(uploadedUrl);
      } catch (error) {
        Alert.alert('Error', 'Impossibile caricare l\'immagine');
      } finally {
        setUploading(false);
      }
    }
  };

  const loadArtists = async () => {
    try {
      setLoading(true);
      const data = await artistApi.getAll();
      setArtists(data);
    } catch (error) {
      Alert.alert('Error', 'Impossibile caricare gli artisti');
    } finally {
      setLoading(false);
    }
  };

  const handleAddArtist = async () => {
    if (!nome || !cognome) {
      Alert.alert('Error', 'Nome e cognome sono obbligatori');
      return;
    }

    try {
      console.log('Creating artist:', { nome, cognome, urlImmagine });
      const newArtist = await artistApi.create({ nome, cognome, urlImmagine: urlImmagine || undefined });
      console.log('Artist created:', newArtist);
      setArtists([...artists, newArtist]);
      setModalVisible(false);
      setNome('');
      setCognome('');
      setUrlImmagine('');
      Alert.alert('Success', 'Artista aggiunto con successo');
    } catch (error) {
      console.error('Error creating artist:', error);
      Alert.alert('Error', 'Impossibile aggiungere l\'artista');
    }
  };

  const renderArtist = ({ item }: { item: Artist }) => (
    <View style={styles.artistItem}>
      {item.urlImmagine && (
        <Image source={{ uri: item.urlImmagine }} style={styles.artistImage} />
      )}
      <View style={styles.artistInfo}>
        <Text style={styles.artistName}>{item.nome} {item.cognome}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Artisti</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Aggiungi</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loading} />
      ) : (
        <FlatList
          data={artists}
          renderItem={renderArtist}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nessun artista presente</Text>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nuovo Artista</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nome *"
              value={nome}
              onChangeText={setNome}
            />
            <TextInput
              style={styles.input}
              placeholder="Cognome *"
              value={cognome}
              onChangeText={setCognome}
            />
            <TouchableOpacity style={styles.imageUploadButton} onPress={pickImage} disabled={uploading}>
              <Text style={styles.imageUploadButtonText}>
                {uploading ? 'Caricamento...' : urlImmagine ? 'Cambia immagine' : 'Carica immagine'}
              </Text>
            </TouchableOpacity>
            {urlImmagine && (
              <Image source={{ uri: urlImmagine }} style={styles.previewImage} />
            )}

            <View style={styles.modalButtons}>
              <Button title="Annulla" onPress={() => setModalVisible(false)} color="#999" />
              <Button title="Salva" onPress={handleAddArtist} />
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
  artistItem: {
    padding: 16,
    backgroundColor: '#181818',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#282828',
  },
  artistImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    backgroundColor: '#282828',
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
});
