package com.musicapp.controller;

import com.musicapp.dto.ApiResponse;
import com.musicapp.dto.ArtistaDTO;
import com.musicapp.service.ArtistaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/artisti")
@RequiredArgsConstructor
public class ArtistaController {

    private final ArtistaService artistaService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ArtistaDTO>>> getAllArtisti() {
        List<ArtistaDTO> artisti = artistaService.getAllArtisti();
        return ResponseEntity.ok(ApiResponse.success(artisti, "Artisti recuperate con successo"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ArtistaDTO>> getArtistaById(@PathVariable Long id) {
        ArtistaDTO artista = artistaService.getArtistaById(id);
        if (artista == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("Artista non trovato"));
        }
        return ResponseEntity.ok(ApiResponse.success(artista, "Artista recuperato con successo"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ArtistaDTO>> createArtista(@RequestBody ArtistaDTO artistaDTO) {
        ArtistaDTO created = artistaService.createArtista(artistaDTO);
        return ResponseEntity.ok(ApiResponse.success(created, "Artista creato con successo"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ArtistaDTO>> updateArtista(@PathVariable Long id, @RequestBody ArtistaDTO artistaDTO) {
        try {
            ArtistaDTO updated = artistaService.updateArtista(id, artistaDTO);
            return ResponseEntity.ok(ApiResponse.success(updated, "Artista aggiornato con successo"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteArtista(@PathVariable Long id) {
        artistaService.deleteArtista(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Artista eliminato con successo"));
    }
}
