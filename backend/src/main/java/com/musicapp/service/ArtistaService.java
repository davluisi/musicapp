package com.musicapp.service;

import com.musicapp.dto.ArtistaDTO;
import com.musicapp.entity.Artista;
import com.musicapp.repository.ArtistaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ArtistaService {

    private final ArtistaRepository artistaRepository;
    private final S3StorageService s3StorageService;

    public List<ArtistaDTO> getAllArtisti() {
        return artistaRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public ArtistaDTO getArtistaById(Long id) {
        return artistaRepository.findById(id)
                .map(this::toDTO)
                .orElse(null);
    }

    public ArtistaDTO createArtista(ArtistaDTO artistaDTO) {
        Artista artista = toEntity(artistaDTO);
        Artista saved = artistaRepository.save(artista);
        return toDTO(saved);
    }

    public ArtistaDTO updateArtista(Long id, ArtistaDTO artistaDTO) {
        Artista artista = artistaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Artista non trovato"));
        
        // Se l'immagine è cambiata, elimina la vecchia da S3
        if (artista.getUrlImmagine() != null && !artista.getUrlImmagine().equals(artistaDTO.getUrlImmagine())) {
            s3StorageService.deleteFileByUrlOrKey(artista.getUrlImmagine());
        }

        artista.setNome(artistaDTO.getNome());
        artista.setUrlImmagine(artistaDTO.getUrlImmagine());
        
        Artista updated = artistaRepository.save(artista);
        return toDTO(updated);
    }

    public void deleteArtista(Long id) {
        artistaRepository.findById(id).ifPresent(artista -> {
            if (artista.getUrlImmagine() != null) {
                s3StorageService.deleteFileByUrlOrKey(artista.getUrlImmagine());
            }
            artistaRepository.delete(artista);
        });
    }

    private ArtistaDTO toDTO(Artista artista) {
        return new ArtistaDTO(
                artista.getId(),
                artista.getNome(),
                artista.getUrlImmagine()
        );
    }

    private Artista toEntity(ArtistaDTO dto) {
        Artista artista = new Artista();
        artista.setNome(dto.getNome());
        artista.setUrlImmagine(dto.getUrlImmagine());
        return artista;
    }
}
