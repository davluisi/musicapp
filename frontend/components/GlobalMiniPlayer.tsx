import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { showDialog } from '../services/DialogContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '../services/AudioContext';
import { useAuth } from '../services/AuthContext';
import { getMediaUrl, getSongCoverUrl, Playlist, Song, playlistApi, songApi } from '../services/api';
import { navigationRef } from '../services/navigation';
import { theme } from '../services/theme';

interface GlobalMiniPlayerProps {
  onEditSong?: (song: Song) => void;
  onSongDeleted?: (songId: number) => void;
}

export function NowPlayingBanner({ floating = true }: { floating?: boolean }) {
  const {
    activeSong,
    isPlaying,
    handleMiniPlayerToggle,
    openSongDetail,
    restartSong,
    nextSong,
    getSongTitle,
  } = useAudio();

  if (!activeSong) {
    return null;
  }

  return (
    <View style={[styles.miniPlayer, floating ? styles.miniPlayerFloating : styles.miniPlayerEmbedded]}>
      <TouchableOpacity
        style={styles.miniPlayerLeft}
        onPress={() => openSongDetail(activeSong)}
        activeOpacity={0.8}
      >
        {getSongCoverUrl(activeSong) ? (
          <Image
            source={{ uri: getSongCoverUrl(activeSong) }}
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
              : 'Spotifai Player'}
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
  );
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
    handleMiniPlayerToggle,
    openSongDetail,
    closeSongDetail,
    openSongOptions,
    closeSongOptions,
    openPlaylistPickerForSong,
    closePlaylistPicker,
    playlistPickerVisible,
    selectedPlaylists,
    setSelectedPlaylists,
    handleSavePlaylistsForSong,
    stopAndClearPlayer,
    restartSong,
    nextSong,
    formatTime,
    getSongTitle,
    playSongOnly,
    enqueueSongNext,
    enqueueSongLast,
    requestEditSong,
    notifyLibraryChanged,
  } = useAudio();

  const { user } = useAuth();
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [playlistQuery, setPlaylistQuery] = useState('');

  useEffect(() => {
    if (!playlistPickerVisible || !user) {
      return;
    }
    let cancelled = false;
    playlistApi.getByUtente(user.id)
      .then((data) => {
        if (!cancelled) {
          setUserPlaylists(data);
        }
      })
      .catch((err) => {
        console.error('Error loading playlists', err);
        if (!cancelled) {
          showDialog('Errore', 'Impossibile caricare le playlist.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [playlistPickerVisible, user]);

  const confirmDeleteSong = (song: Song) => {
    showDialog(
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
              notifyLibraryChanged();
              if (onSongDeleted) {
                onSongDeleted(song.id);
              }
              showDialog('Successo', 'Canzone eliminata correttamente');
            } catch (err) {
              console.error('Delete song error', err);
              showDialog('Errore', 'Impossibile eliminare la canzone');
            }
          },
        },
      ]
    );
  };

  const detailedSong = activeSong;

  return (
    <>
      {activeSong && (
      <>
      <NowPlayingBanner />

      {/* FULL SCREEN / DETAILED SONG MODAL */}
      <Modal
        visible={detailModalVisible && !!detailedSong}
        animationType="none"
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
              {getSongCoverUrl(detailedSong) ? (
                <Image
                  source={{ uri: getSongCoverUrl(detailedSong) }}
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
      </>
      )}

      {/* 3 DOTS SONG OPTIONS POPUP MODAL */}
      <Modal
        visible={songOptionsMenuVisible && !!songForOptions}
        animationType="none"
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

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                if (!songForOptions) return;
                closeSongOptions();
                playSongOnly(songForOptions);
              }}
            >
              <Ionicons name="play" size={22} color={theme.colors.text} />
              <Text style={styles.optionRowText}>Riproduci</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                if (!songForOptions) return;
                closeSongOptions();
                enqueueSongLast(songForOptions);
              }}
            >
              <Ionicons name="list" size={22} color={theme.colors.text} />
              <Text style={styles.optionRowText}>Metti in coda</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                if (!songForOptions) return;
                closeSongOptions();
                enqueueSongNext(songForOptions);
              }}
            >
              <Ionicons name="play-skip-forward" size={22} color={theme.colors.text} />
              <Text style={styles.optionRowText}>Riproduci dopo</Text>
            </TouchableOpacity>

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

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                if (!songForOptions) return;
                if (onEditSong) {
                  closeSongOptions();
                  onEditSong(songForOptions);
                  return;
                }
                closeSongOptions();
                requestEditSong(songForOptions);
                if (navigationRef.isReady()) {
                  navigationRef.navigate('Songs' as never);
                }
              }}
            >
              <Ionicons name="pencil-outline" size={22} color={theme.colors.text} />
              <Text style={styles.optionRowText}>Modifica</Text>
            </TouchableOpacity>

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

      <Modal
        visible={playlistPickerVisible}
        animationType="none"
        transparent
        statusBarTranslucent
        onRequestClose={closePlaylistPicker}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Aggiungi a una playlist</Text>
              <TouchableOpacity onPress={closePlaylistPicker}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearch}>
              <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Cerca playlist..."
                placeholderTextColor={theme.colors.textMuted}
                value={playlistQuery}
                onChangeText={setPlaylistQuery}
              />
            </View>
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {userPlaylists.filter((playlist) =>
                playlist.nome.toLowerCase().includes(playlistQuery.toLowerCase())
              ).length === 0 ? (
                <Text style={styles.pickerEmpty}>Nessuna playlist disponibile</Text>
              ) : (
                userPlaylists
                  .filter((playlist) => playlist.nome.toLowerCase().includes(playlistQuery.toLowerCase()))
                  .map((playlist) => {
                    const isSelected = selectedPlaylists.includes(playlist.id);
                    return (
                      <TouchableOpacity
                        key={playlist.id}
                        style={styles.pickerRow}
                        onPress={() => {
                          setSelectedPlaylists((prev) =>
                            prev.includes(playlist.id)
                              ? prev.filter((id) => id !== playlist.id)
                              : [...prev, playlist.id]
                          );
                        }}
                      >
                        <Text style={styles.pickerRowText} numberOfLines={1}>{playlist.nome}</Text>
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={isSelected ? theme.colors.primary : theme.colors.textMuted}
                        />
                      </TouchableOpacity>
                    );
                  })
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.pickerSave}
              onPress={() => {
                if (user) {
                  handleSavePlaylistsForSong(user.id);
                }
              }}
            >
              <Text style={styles.pickerSaveText}>Salva</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  miniPlayer: {
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
  miniPlayerFloating: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 104 : 84,
    left: 14,
    right: 14,
  },
  miniPlayerEmbedded: {
    marginHorizontal: 14,
    marginBottom: 12,
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  pickerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: theme.spacing.lg,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  pickerTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 12,
    marginBottom: theme.spacing.md,
  },
  pickerSearchInput: {
    flex: 1,
    color: theme.colors.text,
    paddingVertical: 10,
    marginLeft: 8,
  },
  pickerList: {
    maxHeight: 280,
  },
  pickerEmpty: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  pickerRowText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  pickerSave: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    paddingVertical: 13,
  },
  pickerSaveText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
});
