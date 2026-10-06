package com.musicapp.service;

import com.musicapp.dto.AlbumDTO;
import com.musicapp.dto.ArtistaDTO;
import com.musicapp.dto.CanzoneDTO;
import com.musicapp.entity.Album;
import com.musicapp.entity.Artista;
import com.musicapp.entity.Canzone;
import com.musicapp.repository.AlbumRepository;
import com.musicapp.repository.ArtistaRepository;
import com.musicapp.repository.CanzoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CanzoneService {

    private final CanzoneRepository canzoneRepository;
    private final AlbumRepository albumRepository;
    private final ArtistaRepository artistaRepository;
    private final S3StorageService s3StorageService;

    public List<CanzoneDTO> getAllCanzoni() {
        return canzoneRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public CanzoneDTO getCanzoneById(Long id) {
        return canzoneRepository.findById(id)
                .map(this::toDTO)
                .orElse(null);
    }

    public CanzoneDTO createCanzone(CanzoneDTO canzoneDTO) {
        Canzone canzone = toEntity(canzoneDTO);
        Canzone saved = canzoneRepository.save(canzone);
        return toDTO(saved);
    }

    public CanzoneDTO updateCanzone(Long id, CanzoneDTO canzoneDTO) {
        Canzone canzone = canzoneRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Canzone non trovata"));
        
        // Se l'audio è cambiato, rimuovi il vecchio da S3
        if (canzone.getUrlFileAudio() != null && !canzone.getUrlFileAudio().equals(canzoneDTO.getUrlFileAudio())) {
            s3StorageService.deleteFileByUrlOrKey(canzone.getUrlFileAudio());
        }

        // Se l'immagine è cambiata, rimuovi la vecchia da S3
        if (canzone.getUrlImmagine() != null && !canzone.getUrlImmagine().equals(canzoneDTO.getUrlImmagine())) {
            s3StorageService.deleteFileByUrlOrKey(canzone.getUrlImmagine());
        }

        canzone.setNome(canzoneDTO.getNome());
        canzone.setUrlFileAudio(canzoneDTO.getUrlFileAudio());
        canzone.setAnno(canzoneDTO.getAnno());
        canzone.setUrlImmagine(canzoneDTO.getUrlImmagine());
        
        if (canzoneDTO.getAlbum() != null && canzoneDTO.getAlbum().getId() != null) {
            Album album = albumRepository.findById(canzoneDTO.getAlbum().getId())
                    .orElseThrow(() -> new RuntimeException("Album non trovato"));
            canzone.setAlbum(album);
        }
        
        if (canzoneDTO.getArtisti() != null) {
            List<Artista> artisti = canzoneDTO.getArtisti().stream()
                    .map(dto -> artistaRepository.findById(dto.getId())
                            .orElseThrow(() -> new RuntimeException("Artista non trovato")))
                    .collect(Collectors.toList());
            canzone.setArtisti(new java.util.HashSet<>(artisti));
        }
        
        Canzone updated = canzoneRepository.save(canzone);
        return toDTO(updated);
    }

    public void deleteCanzone(Long id) {
        canzoneRepository.findById(id).ifPresent(canzone -> {
            if (canzone.getUrlFileAudio() != null) {
                s3StorageService.deleteFileByUrlOrKey(canzone.getUrlFileAudio());
            }
            if (canzone.getUrlImmagine() != null) {
                s3StorageService.deleteFileByUrlOrKey(canzone.getUrlImmagine());
            }
            canzoneRepository.delete(canzone);
        });
    }

    private CanzoneDTO toDTO(Canzone canzone) {
        AlbumDTO albumDTO = canzone.getAlbum() != null ? toAlbumDTO(canzone.getAlbum()) : null;
        List<ArtistaDTO> artistiDTO = canzone.getArtisti().stream()
                .map(this::toArtistaDTO)
                .collect(Collectors.toList());
        
        return new CanzoneDTO(
                canzone.getId(),
                canzone.getNome(),
                canzone.getUrlFileAudio(),
                canzone.getAnno(),
                canzone.getUrlImmagine(),
                albumDTO,
                artistiDTO
        );
    }

    private AlbumDTO toAlbumDTO(Album album) {
        return new AlbumDTO(
                album.getId(),
                album.getNome(),
                album.getAnno(),
                album.getUrlImmagine(),
                null
        );
    }

    private ArtistaDTO toArtistaDTO(Artista artista) {
        return new ArtistaDTO(
                artista.getId(),
                artista.getNome(),
                artista.getUrlImmagine()
        );
    }

    private Canzone toEntity(CanzoneDTO dto) {
        Canzone canzone = new Canzone();
        canzone.setNome(dto.getNome());
        canzone.setUrlFileAudio(dto.getUrlFileAudio());
        canzone.setAnno(dto.getAnno());
        canzone.setUrlImmagine(dto.getUrlImmagine());
        
        if (dto.getAlbum() != null && dto.getAlbum().getId() != null) {
            Album album = albumRepository.findById(dto.getAlbum().getId())
                    .orElseThrow(() -> new RuntimeException("Album non trovato"));
            canzone.setAlbum(album);
        }
        
        if (dto.getArtisti() != null) {
            List<Artista> artisti = dto.getArtisti().stream()
                    .map(artistaDTO -> artistaRepository.findById(artistaDTO.getId())
                            .orElseThrow(() -> new RuntimeException("Artista non trovato")))
                    .collect(Collectors.toList());
            canzone.setArtisti(new java.util.HashSet<>(artisti));
        }
        
        return canzone;
    }
}
