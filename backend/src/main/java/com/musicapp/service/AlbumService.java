package com.musicapp.service;

import com.musicapp.dto.AlbumDTO;
import com.musicapp.dto.ArtistaDTO;
import com.musicapp.entity.Album;
import com.musicapp.entity.Artista;
import com.musicapp.repository.AlbumRepository;
import com.musicapp.repository.ArtistaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AlbumService {

    private final AlbumRepository albumRepository;
    private final ArtistaRepository artistaRepository;

    public List<AlbumDTO> getAllAlbums() {
        return albumRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public AlbumDTO getAlbumById(Long id) {
        return albumRepository.findById(id)
                .map(this::toDTO)
                .orElse(null);
    }

    public AlbumDTO createAlbum(AlbumDTO albumDTO) {
        Album album = toEntity(albumDTO);
        Album saved = albumRepository.save(album);
        return toDTO(saved);
    }

    public AlbumDTO updateAlbum(Long id, AlbumDTO albumDTO) {
        Album album = albumRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Album non trovato"));
        
        album.setNome(albumDTO.getNome());
        album.setAnno(albumDTO.getAnno());
        album.setUrlImmagine(albumDTO.getUrlImmagine());
        
        if (albumDTO.getArtisti() != null) {
            List<Artista> artisti = albumDTO.getArtisti().stream()
                    .map(dto -> artistaRepository.findById(dto.getId())
                            .orElseThrow(() -> new RuntimeException("Artista non trovato")))
                    .collect(Collectors.toList());
            album.setArtisti(new java.util.HashSet<>(artisti));
        }
        
        Album updated = albumRepository.save(album);
        return toDTO(updated);
    }

    public void deleteAlbum(Long id) {
        albumRepository.deleteById(id);
    }

    private AlbumDTO toDTO(Album album) {
        List<ArtistaDTO> artistiDTO = album.getArtisti().stream()
                .map(this::toArtistaDTO)
                .collect(Collectors.toList());
        
        return new AlbumDTO(
                album.getId(),
                album.getNome(),
                album.getAnno(),
                album.getUrlImmagine(),
                artistiDTO
        );
    }

    private ArtistaDTO toArtistaDTO(Artista artista) {
        return new ArtistaDTO(
                artista.getId(),
                artista.getNome(),
                artista.getCognome(),
                artista.getUrlImmagine()
        );
    }

    private Album toEntity(AlbumDTO dto) {
        Album album = new Album();
        album.setNome(dto.getNome());
        album.setAnno(dto.getAnno());
        album.setUrlImmagine(dto.getUrlImmagine());
        
        if (dto.getArtisti() != null) {
            List<Artista> artisti = dto.getArtisti().stream()
                    .map(artistaDTO -> artistaRepository.findById(artistaDTO.getId())
                            .orElseThrow(() -> new RuntimeException("Artista non trovato")))
                    .collect(Collectors.toList());
            album.setArtisti(new java.util.HashSet<>(artisti));
        }
        
        return album;
    }
}
