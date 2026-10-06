package com.musicapp.dto;

import java.util.List;

public class CanzoneDTO {
    private Long id;
    private String nome;
    private String urlFileAudio;
    private Integer anno;
    private String urlImmagine;
    private AlbumDTO album;
    private List<ArtistaDTO> artisti;

    public CanzoneDTO() {
    }

    public CanzoneDTO(Long id, String nome, String urlFileAudio, Integer anno, String urlImmagine, AlbumDTO album, List<ArtistaDTO> artisti) {
        this.id = id;
        this.nome = nome;
        this.urlFileAudio = urlFileAudio;
        this.anno = anno;
        this.urlImmagine = urlImmagine;
        this.album = album;
        this.artisti = artisti;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getUrlFileAudio() {
        return urlFileAudio;
    }

    public void setUrlFileAudio(String urlFileAudio) {
        this.urlFileAudio = urlFileAudio;
    }

    public Integer getAnno() {
        return anno;
    }

    public void setAnno(Integer anno) {
        this.anno = anno;
    }

    public String getUrlImmagine() {
        return urlImmagine;
    }

    public void setUrlImmagine(String urlImmagine) {
        this.urlImmagine = urlImmagine;
    }

    public AlbumDTO getAlbum() {
        return album;
    }

    public void setAlbum(AlbumDTO album) {
        this.album = album;
    }

    public List<ArtistaDTO> getArtisti() {
        return artisti;
    }

    public void setArtisti(List<ArtistaDTO> artisti) {
        this.artisti = artisti;
    }
}
