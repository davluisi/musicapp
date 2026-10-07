package com.musicapp.service;

import com.musicapp.dto.LoginRequest;
import com.musicapp.dto.RegisterRequest;
import com.musicapp.dto.UpdateUtenteRequest;
import com.musicapp.dto.UtenteDTO;
import com.musicapp.entity.Utente;
import com.musicapp.repository.UtenteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UtenteRepository utenteRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UtenteDTO register(RegisterRequest request) {
        if (utenteRepository.existsByEmail(request.getEmail().trim().toLowerCase())) {
            throw new IllegalArgumentException("Email già registrata");
        }

        Utente utente = new Utente();
        utente.setNome(request.getNome().trim());
        utente.setCognome(request.getCognome().trim());
        utente.setEmail(request.getEmail().trim().toLowerCase());
        utente.setPassword(passwordEncoder.encode(request.getPassword()));
        utente.setUrlImmagineProfilo(request.getUrlImmagineProfilo());

        Utente saved = utenteRepository.save(utente);
        return mapToDTO(saved);
    }

    public UtenteDTO login(LoginRequest request) {
        Utente utente = utenteRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Credenziali non valide"));

        if (!passwordEncoder.matches(request.getPassword(), utente.getPassword())) {
            throw new IllegalArgumentException("Credenziali non valide");
        }

        return mapToDTO(utente);
    }

    public UtenteDTO getProfile(Long id) {
        Utente utente = utenteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Utente non trovato"));
        return mapToDTO(utente);
    }

    @Transactional
    public UtenteDTO updateProfile(Long id, UpdateUtenteRequest request) {
        Utente utente = utenteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Utente non trovato"));

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.equals(utente.getEmail()) && utenteRepository.existsByEmail(newEmail)) {
                throw new IllegalArgumentException("Email già in uso");
            }
            utente.setEmail(newEmail);
        }

        if (request.getNome() != null && !request.getNome().trim().isEmpty()) {
            utente.setNome(request.getNome().trim());
        }

        if (request.getCognome() != null && !request.getCognome().trim().isEmpty()) {
            utente.setCognome(request.getCognome().trim());
        }

        if (request.getUrlImmagineProfilo() != null) {
            utente.setUrlImmagineProfilo(request.getUrlImmagineProfilo());
        }

        Utente saved = utenteRepository.save(utente);
        return mapToDTO(saved);
    }

    private UtenteDTO mapToDTO(Utente utente) {
        return UtenteDTO.builder()
                .id(utente.getId())
                .nome(utente.getNome())
                .cognome(utente.getCognome())
                .email(utente.getEmail())
                .urlImmagineProfilo(utente.getUrlImmagineProfilo())
                .createdAt(utente.getCreatedAt())
                .build();
    }
}
