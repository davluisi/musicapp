import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../services/AudioContext';
import { useAuth } from '../services/AuthContext';
import { getMediaUrl, Song, songApi } from '../services/api';
import { theme } from '../services/theme';

interface GlobalMiniPlayerProps {
  onEditSong?: (song: Song) => void;
  onSongDeleted?: (songId: number) => void;
}

export const GlobalMiniPlayer: React.FC<GlobalMiniPlayerProps> = ({
  onEditSong,
  onSongDeleted,
}) => {
  const {
    activeSong,
    isPlaying,
    playbackPosition,
    playbackDuration,
    detailModalVisible,
    songOptionsMenuVisible,
    songForOptions,
    togglePlaySong,
    handleMiniPlayerToggle,
    openSongDetail,
    closeSongDetail,
    openSongOptions,
    closeSongOptions,
    openPlaylistPickerForSong,
    stopAndClearPlayer,
    restartSong,
    nextSong,
    formatTime,
    getSongTitle,
  } = useAudio();

  const { user, isLoggedIn } = useAuth();

  if (!activeSong) {
    return null;
  }

  const confirmDeleteSong = (song: Song) => {
    Alert.alert(
      'Elimina Canzone',
      `Sei sicuro di voler eliminare "${getSongTitle(song)}"? L'audio e le immagini associate verranno rimosse.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              if (activeSong?.id === song.id) {
                stopAndClearPlayer();
              }
              await songApi.delete(song.id);
              closeSongDetail();
              closeSongOptions();
              if (onSongDeleted) {
                onSongDeleted(song.id);
              }
              Alert.alert('Successo', 'Canzone eliminata correttamente');
            } catch (err) {
              console.error('Delete song error', err);
              Alert.alert('Errore', 'Impossibile eliminare la canzone');
            }
          },
        },
      ]
    );
  };

  const detailedSong = activeSong;

  return (
    <>
      {/* Sticky Floating Bottom Mini Player above Bottom Tab Navigator */}
      <View style={styles.miniPlayer}>
        <TouchableOpacity
          style={styles.miniPlayerLeft}
          onPress={() => openSongDetail(activeSong)}
          activeOpacity={0.8}
        >
          {activeSong.urlImmagine ? (
            <Image
              source={{ uri: getMediaUrl(activeSong.urlImmagine) }}
              style={styles.miniPlayerCover}
            />
          ) : (
            <View style={styles.miniPlayerPlaceholder}>
              <Ionicons name="musical-note" size={18} color={theme.colors.primary} />
            </View>
          )}
          <View style={styles.miniPlayerTextContainer}>
            <Text style={styles.miniPlayerTitle} numberOfLines={1}>
              {getSongTitle(activeSong)}
            </Text>
            <Text style={styles.miniPlayerArtist} numberOfLines={1}>
              {activeSong.artisti && activeSong.artisti.length > 0
                ? activeSong.artisti.map(a => a.nome).join(', ')
                : 'MusicApp Player'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.miniPlayerControls}>
          <TouchableOpacity
            onPress={restartSong}
            style={styles.miniPlayerNavBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="play-skip-back" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMiniPlayerToggle} style={styles.miniPlayerPlayBtn}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={22}
              color="#000"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={nextSong}
            style={styles.miniPlayerNavBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="play-skip-forward" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* FULL SCREEN / DETAILED SONG MODAL */}
      <Modal
        visible={detailModalVisible && !!detailedSong}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={closeSongDetail}
      >
        {detailedSong && (
          <SafeAreaView style={styles.detailContainer} edges={['top', 'bottom', 'left', 'right']}>
            {/* Top Bar with Back and 3 Dots */}
            <View style={styles.detailHeader}>
              <TouchableOpacity
                onPress={closeSongDetail}
                style={styles.detailHeaderBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="chevron-down" size={28} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle} numberOfLines={1}>
                In Riproduzione
              </Text>
              <TouchableOpacity
                onPress={() => openSongOptions(detailedSong)}
                style={styles.detailHeaderBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Center: Large Cover Art */}
            <View style={styles.detailCoverSection}>
              {detailedSong.urlImmagine ? (
                <Image
                  source={{ uri: getMediaUrl(detailedSong.urlImmagine) }}
                  style={styles.detailLargeCover}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.detailLargeCoverPlaceholder}>
                  <Ionicons name="musical-note" size={80} color={theme.colors.textMuted} />
                </View>
              )}
            </View>

            {/* Song Meta Details */}
            <View style={styles.detailMetaSection}>
              <Text style={styles.detailSongTitle} numberOfLines={2}>
                {getSongTitle(detailedSong)}
              </Text>
              <Text style={styles.detailSongArtists} numberOfLines={1}>
                {detailedSong.artisti && detailedSong.artisti.length > 0
                  ? detailedSong.artisti.map(a => a.nome).join(', ')
                  : 'Artista sconosciuto'}
              </Text>
              {detailedSong.album && (
                <Text style={styles.detailSongAlbum} numberOfLines={1}>
                  Album: {detailedSong.album.nome} {detailedSong.anno ? `(${detailedSong.anno})` : ''}
                </Text>
              )}
            </View>

            {/* Bottom: Progress Bar & Playback Controls */}
            <View style={styles.detailControlsSection}>
              <View style={styles.detailProgressBarTrack}>
                <View
                  style={[
                    styles.detailProgressBarFill,
                    {
                      width:
                        playbackDuration > 0
                          ? `${Math.min(100, Math.max(0, (playbackPosition / playbackDuration) * 100))}%`
                          : '0%',
                    },
                  ]}
                />
              </View>

              <View style={styles.detailTimeRow}>
                <Text style={styles.detailTimeText}>
                  {formatTime(playbackPosition)}
                </Text>
                <Text style={styles.detailTimeText}>
                  {formatTime(playbackDuration)}
                </Text>
              </View>

              {/* Controls Row: << , Play/Pause , >> */}
              <View style={styles.detailPlayRow}>
                <TouchableOpacity
                  style={styles.detailNavBtn}
                  onPress={restartSong}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="play-skip-back" size={32} color={theme.colors.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.detailPlayBtn}
                  onPress={handleMiniPlayerToggle}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={36}
                    color="#000"
                    style={{ marginLeft: isPlaying ? 0 : 3 }}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.detailNavBtn}
                  onPress={nextSong}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="play-skip-forward" size={32} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        )}
      </Modal>

      {/* 3 DOTS SONG OPTIONS POPUP MODAL */}
      <Modal
        visible={songOptionsMenuVisible && !!songForOptions}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={closeSongOptions}
      >
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={closeSongOptions}
        >
          <View style={styles.optionsContent}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle} numberOfLines={1}>
                {songForOptions ? getSongTitle(songForOptions) : ''}
              </Text>
              <Text style={styles.optionsSubtitle} numberOfLines={1}>
                {songForOptions?.artisti && songForOptions.artisti.length > 0
                  ? songForOptions.artisti.map(a => a.nome).join(', ')
                  : 'Opzioni canzone'}
              </Text>
            </View>

            {/* Option: Modifica */}
            {onEditSong && (
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => {
                  if (songForOptions) {
                    closeSongOptions();
                    onEditSong(songForOptions);
                  }
                }}
              >
                <Ionicons name="pencil-outline" size={22} color={theme.colors.text} />
                <Text style={styles.optionRowText}>Modifica</Text>
              </TouchableOpacity>
            )}

            {/* Option: Aggiungi a una playlist */}
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                if (songForOptions) {
                  closeSongOptions();
                  openPlaylistPickerForSong(songForOptions, user?.id);
                }
              }}
            >
              <Ionicons name="list-outline" size={22} color={theme.colors.text} />
              <Text style={styles.optionRowText}>Aggiungi a una playlist</Text>
            </TouchableOpacity>

            {/* Option: Elimina */}
            <TouchableOpacity
              style={[styles.optionRow, styles.optionRowDestructive]}
              onPress={() => {
                if (songForOptions) {
                  closeSongOptions();
                  confirmDeleteSong(songForOptions);
                }
              }}
            >
              <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
              <Text style={[styles.optionRowText, styles.optionRowTextDestructive]}>Elimina</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCancelBtn}
              onPress={closeSongOptions}
            >
              <Text style={styles.optionCancelText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  miniPlayer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 104 : 84,
    left: 14,
    right: 14,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 9999,
  },
  miniPlayerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  miniPlayerCover: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 10,
  },
  miniPlayerPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  miniPlayerTextContainer: {
    flex: 1,
  },
  miniPlayerTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  miniPlayerArtist: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  miniPlayerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniPlayerNavBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniPlayerPlayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* Full screen / PageSheet Detail Modal Styles */
  detailContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
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
  detailCoverSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  detailLargeCover: {
    width: 290,
    height: 290,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },
  detailLargeCoverPlaceholder: {
    width: 290,
    height: 290,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  detailMetaSection: {
    marginBottom: 20,
  },
  detailSongTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 6,
  },
  detailSongArtists: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  detailSongAlbum: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  detailControlsSection: {
    marginTop: 10,
  },
  detailProgressBarTrack: {
    height: 6,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  detailProgressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  detailTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailTimeText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  detailPlayRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    marginBottom: 10,
  },
  detailNavBtn: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailPlayBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
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
