package com.musicapp.service;

import com.musicapp.dto.CanzoneDTO;
import com.musicapp.dto.PlaylistDTO;
import com.musicapp.entity.Canzone;
import com.musicapp.entity.Playlist;
import com.musicapp.entity.Utente;
import com.musicapp.repository.PlaylistRepository;
import com.musicapp.repository.UtenteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlaylistService {

    private final PlaylistRepository playlistRepository;
    private final UtenteRepository utenteRepository;
    private final com.musicapp.repository.CanzoneRepository canzoneRepository;
    private final CanzoneService canzoneService;
    private final S3StorageService s3StorageService;

    @Transactional(readOnly = true)
    public List<CanzoneDTO> getCanzoniByPlaylistId(Long playlistId) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new RuntimeException("Playlist non trovata"));
        List<Canzone> canzoni = playlist.getCanzoni().stream()
                .sorted(Comparator.comparing(Canzone::getNome, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .collect(Collectors.toList());
        return canzoneService.toCanzoneDTOList(canzoni);
    }

    public List<Long> getPlaylistIdsForCanzone(Long canzoneId, Long utenteId) {
        return playlistRepository.findPlaylistIdsByCanzoneIdAndUtenteId(canzoneId, utenteId);
    }

    public void addCanzoneToPlaylist(Long playlistId, Long canzoneId) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new RuntimeException("Playlist non trovata"));
        com.musicapp.entity.Canzone canzone = canzoneRepository.findById(canzoneId)
                .orElseThrow(() -> new RuntimeException("Canzone non trovata"));

        playlist.getCanzoni().add(canzone);
        playlistRepository.save(playlist);
    }

    public void removeCanzoneFromPlaylist(Long playlistId, Long canzoneId) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new RuntimeException("Playlist non trovata"));
        playlist.getCanzoni().removeIf(c -> c.getId().equals(canzoneId));
        playlistRepository.save(playlist);
    }

    public void syncCanzonePlaylists(Long canzoneId, Long utenteId, List<Long> targetPlaylistIds) {
        List<Playlist> userPlaylists = playlistRepository.findByUtenteIdOrderByCreatedAtDesc(utenteId);
        com.musicapp.entity.Canzone canzone = canzoneRepository.findById(canzoneId)
                .orElseThrow(() -> new RuntimeException("Canzone non trovata"));

        for (Playlist p : userPlaylists) {
            boolean shouldContain = targetPlaylistIds != null && targetPlaylistIds.contains(p.getId());
            boolean currentlyContains = p.getCanzoni().stream().anyMatch(c -> c.getId().equals(canzoneId));

            if (shouldContain && !currentlyContains) {
                p.getCanzoni().add(canzone);
                playlistRepository.save(p);
            } else if (!shouldContain && currentlyContains) {
                p.getCanzoni().removeIf(c -> c.getId().equals(canzoneId));
                playlistRepository.save(p);
            }
        }
    }

    public List<PlaylistDTO> getPlaylistsByUtente(Long utenteId) {
        return playlistRepository.findByUtenteIdOrderByCreatedAtDesc(utenteId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public PlaylistDTO getPlaylistById(Long id) {
        return playlistRepository.findById(id)
                .map(this::toDTO)
                .orElse(null);
    }

    public PlaylistDTO createPlaylist(PlaylistDTO playlistDTO) {
        if (playlistDTO.getUtenteId() == null) {
            throw new IllegalArgumentException("utenteId è obbligatorio per creare una playlist");
        }
        Utente utente = utenteRepository.findById(playlistDTO.getUtenteId())
                .orElseThrow(() -> new RuntimeException("Utente non trovato"));

        Playlist playlist = new Playlist();
        playlist.setNome(playlistDTO.getNome());
        playlist.setUrlImmagine(playlistDTO.getUrlImmagine());
        playlist.setUtente(utente);

        Playlist saved = playlistRepository.save(playlist);
        return toDTO(saved);
    }

    public PlaylistDTO updatePlaylist(Long id, PlaylistDTO playlistDTO) {
        Playlist playlist = playlistRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Playlist non trovata"));

        // Se l'immagine è cambiata, elimina la vecchia da S3
        if (playlist.getUrlImmagine() != null && !playlist.getUrlImmagine().equals(playlistDTO.getUrlImmagine())) {
            s3StorageService.deleteFileByUrlOrKey(playlist.getUrlImmagine());
        }

        playlist.setNome(playlistDTO.getNome());
        playlist.setUrlImmagine(playlistDTO.getUrlImmagine());

        Playlist updated = playlistRepository.save(playlist);
        return toDTO(updated);
    }

    public void deletePlaylist(Long id) {
        playlistRepository.findById(id).ifPresent(playlist -> {
            if (playlist.getUrlImmagine() != null) {
                s3StorageService.deleteFileByUrlOrKey(playlist.getUrlImmagine());
            }
            playlistRepository.delete(playlist);
        });
    }

    private PlaylistDTO toDTO(Playlist playlist) {
        return PlaylistDTO.builder()
                .id(playlist.getId())
                .nome(playlist.getNome())
                .urlImmagine(playlist.getUrlImmagine())
                .utenteId(playlist.getUtente() != null ? playlist.getUtente().getId() : null)
                .createdAt(playlist.getCreatedAt())
                .updatedAt(playlist.getUpdatedAt())
                .build();
    }
}
