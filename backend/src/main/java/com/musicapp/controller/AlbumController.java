package com.musicapp.controller;

import com.musicapp.dto.ApiResponse;
import com.musicapp.dto.AlbumDTO;
import com.musicapp.service.AlbumService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/album")
@RequiredArgsConstructor
public class AlbumController {

    private final AlbumService albumService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AlbumDTO>>> getAllAlbums() {
        List<AlbumDTO> albums = albumService.getAllAlbums();
        return ResponseEntity.ok(ApiResponse.success(albums, "Album recuperati con successo"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AlbumDTO>> getAlbumById(@PathVariable Long id) {
        AlbumDTO album = albumService.getAlbumById(id);
        if (album == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("Album non trovato"));
        }
        return ResponseEntity.ok(ApiResponse.success(album, "Album recuperato con successo"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AlbumDTO>> createAlbum(@RequestBody AlbumDTO albumDTO) {
        AlbumDTO created = albumService.createAlbum(albumDTO);
        return ResponseEntity.ok(ApiResponse.success(created, "Album creato con successo"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AlbumDTO>> updateAlbum(@PathVariable Long id, @RequestBody AlbumDTO albumDTO) {
        try {
            AlbumDTO updated = albumService.updateAlbum(id, albumDTO);
            return ResponseEntity.ok(ApiResponse.success(updated, "Album aggiornato con successo"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAlbum(@PathVariable Long id) {
        albumService.deleteAlbum(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Album eliminato con successo"));
    }
}
