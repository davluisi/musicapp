package com.musicapp.controller;

import com.musicapp.dto.ApiResponse;
import com.musicapp.dto.LoginRequest;
import com.musicapp.dto.RegisterRequest;
import com.musicapp.dto.UpdateUtenteRequest;
import com.musicapp.dto.UtenteDTO;
import com.musicapp.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UtenteDTO>> register(@Valid @RequestBody RegisterRequest request) {
        try {
            UtenteDTO user = authService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success(user, "Registrazione effettuata con successo"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Errore durante la registrazione: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<UtenteDTO>> login(@Valid @RequestBody LoginRequest request) {
        try {
            UtenteDTO user = authService.login(request);
            return ResponseEntity.ok(ApiResponse.success(user, "Login effettuato con successo"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Errore durante il login: " + e.getMessage()));
        }
    }

    @GetMapping("/profile/{id}")
    public ResponseEntity<ApiResponse<UtenteDTO>> getProfile(@PathVariable Long id) {
        try {
            UtenteDTO user = authService.getProfile(id);
            return ResponseEntity.ok(ApiResponse.success(user, "Profilo recuperato con successo"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Errore recupero profilo: " + e.getMessage()));
        }
    }

    @PutMapping("/profile/{id}")
    public ResponseEntity<ApiResponse<UtenteDTO>> updateProfile(@PathVariable Long id, @Valid @RequestBody UpdateUtenteRequest request) {
        try {
            UtenteDTO user = authService.updateProfile(id, request);
            return ResponseEntity.ok(ApiResponse.success(user, "Profilo aggiornato con successo"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Errore aggiornamento profilo: " + e.getMessage()));
        }
    }
}
