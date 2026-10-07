import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Album, Song, getMediaUrl } from '../services/api';
import { useAudio } from '../services/AudioContext';
import { NowPlayingBanner } from './GlobalMiniPlayer';
import { theme } from '../services/theme';

interface AlbumDetailModalProps {
  album: Album | null;
  songs: Song[];
  visible: boolean;
  onClose: () => void;
  onEdit?: (album: Album) => void;
  onDelete?: (album: Album) => void;
}

export function AlbumDetailModal({
  album,
  songs,
  visible,
  onClose,
  onEdit,
  onDelete,
}: AlbumDetailModalProps) {
  const {
    activeSong,
    isPlaying,
    playQueue,
    handleMiniPlayerToggle,
    playSongAndOpen,
    openSongOptions,
  } = useAudio();
  const [optionsVisible, setOptionsVisible] = useState(false);

  const albumSongs = album ? songs.filter(song => song.album?.id === album.id) : [];
  const isAlbumQueueActive = !!album && activeSong?.album?.id === album.id;
  const isAlbumPlaying = isAlbumQueueActive && isPlaying;
  const showMenu = !!onEdit || !!onDelete;

  return (
    <>
      <Modal
        visible={visible && !!album}
        animationType="none"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        {album && (
          <View style={styles.detailContainer}>
            <SafeAreaView style={styles.detailBody} edges={['top', 'left', 'right']}>
            <View style={styles.detailHeader}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.detailHeaderBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="chevron-down" size={28} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle} numberOfLines={1}>
                Album
              </Text>
              {showMenu ? (
                <TouchableOpacity
                  onPress={() => setOptionsVisible(true)}
                  style={styles.detailHeaderBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              ) : (
                <View style={styles.detailHeaderBtn} />
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
              <View style={styles.detailHeroSection}>
                {album.urlImmagine ? (
                  <Image source={{ uri: getMediaUrl(album.urlImmagine) }} style={styles.detailAlbumCover} />
                ) : (
                  <View style={styles.detailAlbumCoverPlaceholder}>
                    <Ionicons name="disc" size={64} color={theme.colors.textMuted} />
                  </View>
                )}
                <Text style={styles.detailAlbumTitle}>{album.nome}</Text>
                <Text style={styles.detailAlbumArtists}>
                  {album.artisti && album.artisti.length > 0
                    ? album.artisti.map(artist => artist.nome).join(', ')
                    : 'Vari Artisti'}
                </Text>
                {album.anno && (
                  <Text style={styles.detailAlbumYear}>Anno di pubblicazione: {album.anno}</Text>
                )}
              </View>

              <View style={styles.detailTracksSection}>
                <View style={styles.detailTracksHeaderRow}>
                  <TouchableOpacity
                    style={[styles.albumPlayAllButton, albumSongs.length === 0 && { opacity: 0.5 }]}
                    onPress={() => {
                      if (albumSongs.length === 0) return;
                      if (isAlbumQueueActive) {
                        handleMiniPlayerToggle();
                      } else {
                        playQueue(albumSongs, 0);
                      }
                    }}
                    activeOpacity={0.8}
                    disabled={albumSongs.length === 0}
                  >
                    <Ionicons
                      name={isAlbumPlaying ? 'pause-circle' : 'play-circle'}
                      size={28}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.albumPlayAllText}>
                      {isAlbumPlaying ? 'Pausa' : 'Riproduci brani'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.detailTracksCount}>{albumSongs.length} brani</Text>
                </View>

                {albumSongs.length === 0 ? (
                  <View style={styles.detailNoTracksBox}>
                    <Ionicons name="musical-notes-outline" size={32} color={theme.colors.textMuted} />
                    <Text style={styles.detailNoTracksText}>Nessuna canzone associata a questo album</Text>
                  </View>
                ) : (
                  albumSongs.map((song, index) => (
                    <TouchableOpacity
                      key={song.id}
                      style={styles.detailTrackRow}
                      onPress={() => playSongAndOpen(song)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.detailTrackNumber}>{index + 1}</Text>
                      {song.urlImmagine ? (
                        <Image source={{ uri: getMediaUrl(song.urlImmagine) }} style={styles.detailTrackThumb} />
                      ) : (
                        <View style={styles.detailTrackThumbPlaceholder}>
                          <Ionicons name="musical-note" size={16} color={theme.colors.textMuted} />
                        </View>
                      )}
                      <View style={styles.detailTrackInfo}>
                        <Text
                          style={[styles.detailTrackTitle, activeSong?.id === song.id && { color: theme.colors.primary }]}
                          numberOfLines={1}
                        >
                          {song.nome || 'Traccia ' + (index + 1)}
                        </Text>
                        <Text style={styles.detailTrackArtist} numberOfLines={1}>
                          {song.artisti && song.artisti.length > 0
                            ? song.artisti.map(artist => artist.nome).join(', ')
                            : 'Artista'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={(event) => {
                          event.stopPropagation();
                          openSongOptions(song);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.text} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </ScrollView>
            </SafeAreaView>
            <NowPlayingBanner />
          </View>
        )}
      </Modal>

      <Modal
        visible={optionsVisible && !!album}
        animationType="none"
        transparent
        statusBarTranslucent
        onRequestClose={() => setOptionsVisible(false)}
      >
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setOptionsVisible(false)}
        >
          <View style={styles.optionsContent}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle} numberOfLines={1}>
                {album?.nome}
              </Text>
              <Text style={styles.optionsSubtitle} numberOfLines={1}>
                {album?.artisti && album.artisti.length > 0
                  ? album.artisti.map(artist => artist.nome).join(', ')
                  : 'Opzioni album'}
              </Text>
            </View>

            {onEdit && album && (
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => {
                  setOptionsVisible(false);
                  onEdit(album);
                }}
              >
                <Ionicons name="pencil-outline" size={22} color={theme.colors.text} />
                <Text style={styles.optionRowText}>Modifica</Text>
              </TouchableOpacity>
            )}

            {onDelete && album && (
              <TouchableOpacity
                style={[styles.optionRow, styles.optionRowDestructive]}
                onPress={() => {
                  setOptionsVisible(false);
                  onDelete(album);
                }}
              >
                <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
                <Text style={[styles.optionRowText, styles.optionRowTextDestructive]}>Elimina</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.optionCancelBtn}
              onPress={() => setOptionsVisible(false)}
            >
              <Text style={styles.optionCancelText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  detailContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  detailBody: {
    flex: 1,
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
    width: 36,
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
    paddingBottom: 120,
  },
  detailHeroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  detailAlbumCover: {
    width: 200,
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  detailAlbumCoverPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  detailAlbumTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  detailAlbumArtists: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  detailAlbumYear: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  detailTracksSection: {
    marginTop: 20,
  },
  detailTracksHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  albumPlayAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: 8,
  },
  albumPlayAllText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  detailTracksCount: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  detailNoTracksBox: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  detailNoTracksText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  detailTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  detailTrackNumber: {
    width: 26,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  detailTrackThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 10,
  },
  detailTrackThumbPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  detailTrackInfo: {
    flex: 1,
  },
  detailTrackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  detailTrackArtist: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
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
