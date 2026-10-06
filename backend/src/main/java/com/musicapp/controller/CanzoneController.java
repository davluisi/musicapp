package com.musicapp.controller;

import com.musicapp.dto.ApiResponse;
import com.musicapp.dto.CanzoneDTO;
import com.musicapp.service.CanzoneService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/canzoni")
@RequiredArgsConstructor
public class CanzoneController {

    private final CanzoneService canzoneService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CanzoneDTO>>> getAllCanzoni() {
        List<CanzoneDTO> canzoni = canzoneService.getAllCanzoni();
        return ResponseEntity.ok(ApiResponse.success(canzoni, "Canzoni recuperate con successo"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CanzoneDTO>> getCanzoneById(@PathVariable Long id) {
        CanzoneDTO canzone = canzoneService.getCanzoneById(id);
        if (canzone == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("Canzone non trovata"));
        }
        return ResponseEntity.ok(ApiResponse.success(canzone, "Canzone recuperata con successo"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CanzoneDTO>> createCanzone(@RequestBody CanzoneDTO canzoneDTO) {
        CanzoneDTO created = canzoneService.createCanzone(canzoneDTO);
        return ResponseEntity.ok(ApiResponse.success(created, "Canzone creata con successo"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CanzoneDTO>> updateCanzone(@PathVariable Long id, @RequestBody CanzoneDTO canzoneDTO) {
        try {
            CanzoneDTO updated = canzoneService.updateCanzone(id, canzoneDTO);
            return ResponseEntity.ok(ApiResponse.success(updated, "Canzone aggiornata con successo"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCanzone(@PathVariable Long id) {
        canzoneService.deleteCanzone(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Canzone eliminata con successo"));
    }
}
