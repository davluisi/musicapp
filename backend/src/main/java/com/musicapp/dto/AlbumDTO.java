package com.musicapp.dto;

import java.util.List;

public class AlbumDTO {
    private Long id;
    private String nome;
    private Integer anno;
    private String urlImmagine;
    private List<ArtistaDTO> artisti;

    public AlbumDTO() {
    }

    public AlbumDTO(Long id, String nome, Integer anno, String urlImmagine, List<ArtistaDTO> artisti) {
        this.id = id;
        this.nome = nome;
        this.anno = anno;
        this.urlImmagine = urlImmagine;
        this.artisti = artisti;
    }

    public AlbumDTO(Long id, String nome, Integer anno, String urlImmagine) {
        this.id = id;
        this.nome = nome;
        this.anno = anno;
        this.urlImmagine = urlImmagine;
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

    public List<ArtistaDTO> getArtisti() {
        return artisti;
    }

    public void setArtisti(List<ArtistaDTO> artisti) {
        this.artisti = artisti;
    }
}
