import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../services/theme';
import { AppVersionInfo, appService } from '../services/api';

interface UpdateModalProps {
  visible: boolean;
  versionInfo: AppVersionInfo | null;
  onDismiss: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  visible,
  versionInfo,
  onDismiss,
}) => {
  if (!versionInfo) return null;

  const handleUpdate = async () => {
    const fullDownloadUrl = appService.getDownloadUrl(versionInfo.apkUrl);
    try {
      await Linking.openURL(fullDownloadUrl);
    } catch (err) {
      console.error('Impossibile aprire il link di download:', err);
    }
  };

  const isMandatory = versionInfo.mandatory ?? false;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isMandatory ? undefined : onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="cloud-download" size={38} color={theme.colors.primary} />
          </View>

          <Text style={styles.title}>Nuovo aggiornamento disponibile!</Text>
          
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Versione {versionInfo.version}</Text>
          </View>

          {versionInfo.releaseNotes ? (
            <View style={styles.notesContainer}>
              <Text style={styles.notesTitle}>Novità:</Text>
              <Text style={styles.notesText}>{versionInfo.releaseNotes}</Text>
            </View>
          ) : (
            <Text style={styles.description}>
              È disponibile una nuova versione di Spotifai con miglioramenti e correzioni.
            </Text>
          )}

          <TouchableOpacity style={styles.updateButton} onPress={handleUpdate} activeOpacity={0.8}>
            <Ionicons name="download-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.updateButtonText}>Scarica e Aggiorna</Text>
          </TouchableOpacity>

          {!isMandatory && (
            <TouchableOpacity style={styles.laterButton} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={styles.laterButtonText}>Più tardi</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(152, 46, 30, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(152, 46, 30, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  badgeText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  notesContainer: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  notesTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  notesText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  description: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  laterButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  laterButtonText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
