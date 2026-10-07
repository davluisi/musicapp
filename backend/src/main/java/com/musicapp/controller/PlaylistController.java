package com.musicapp.controller;

import com.musicapp.dto.ApiResponse;
import com.musicapp.dto.CanzoneDTO;
import com.musicapp.dto.PlaylistDTO;
import com.musicapp.service.PlaylistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/playlists")
@RequiredArgsConstructor
public class PlaylistController {

    private final PlaylistService playlistService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PlaylistDTO>>> getPlaylistsByUtente(@RequestParam("utenteId") Long utenteId) {
        List<PlaylistDTO> playlists = playlistService.getPlaylistsByUtente(utenteId);
        return ResponseEntity.ok(ApiResponse.success(playlists, "Playlist recuperate con successo"));
    }

    @GetMapping("/canzone/{canzoneId}")
    public ResponseEntity<ApiResponse<List<Long>>> getPlaylistIdsForCanzone(
            @PathVariable Long canzoneId,
            @RequestParam("utenteId") Long utenteId) {
        List<Long> playlistIds = playlistService.getPlaylistIdsForCanzone(canzoneId, utenteId);
        return ResponseEntity.ok(ApiResponse.success(playlistIds, "ID playlist recuperati con successo"));
    }

    @PostMapping("/canzone/{canzoneId}/sync")
    public ResponseEntity<ApiResponse<Void>> syncCanzonePlaylists(
            @PathVariable Long canzoneId,
            @RequestParam("utenteId") Long utenteId,
            @RequestBody List<Long> playlistIds) {
        playlistService.syncCanzonePlaylists(canzoneId, utenteId, playlistIds);
        return ResponseEntity.ok(ApiResponse.success(null, "Playlist sincronizzate con successo"));
    }

    @GetMapping("/{id}/canzoni")
    public ResponseEntity<ApiResponse<List<CanzoneDTO>>> getCanzoniByPlaylist(@PathVariable Long id) {
        try {
            List<CanzoneDTO> canzoni = playlistService.getCanzoniByPlaylistId(id);
            return ResponseEntity.ok(ApiResponse.success(canzoni, "Brani della playlist recuperati con successo"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PlaylistDTO>> getPlaylistById(@PathVariable Long id) {
        PlaylistDTO playlist = playlistService.getPlaylistById(id);
        if (playlist == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("Playlist non trovata"));
        }
        return ResponseEntity.ok(ApiResponse.success(playlist, "Playlist recuperata con successo"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PlaylistDTO>> createPlaylist(@RequestBody PlaylistDTO playlistDTO) {
        try {
            PlaylistDTO created = playlistService.createPlaylist(playlistDTO);
            return ResponseEntity.ok(ApiResponse.success(created, "Playlist creata con successo"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PlaylistDTO>> updatePlaylist(@PathVariable Long id, @RequestBody PlaylistDTO playlistDTO) {
        try {
            PlaylistDTO updated = playlistService.updatePlaylist(id, playlistDTO);
            return ResponseEntity.ok(ApiResponse.success(updated, "Playlist aggiornata con successo"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePlaylist(@PathVariable Long id) {
        playlistService.deletePlaylist(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Playlist eliminata con successo"));
    }
}
