package com.musicapp.dto;

public class ArtistaDTO {
    private Long id;
    private String nome;
    private String cognome;
    private String urlImmagine;

    public ArtistaDTO() {
    }

    public ArtistaDTO(Long id, String nome, String cognome, String urlImmagine) {
        this.id = id;
        this.nome = nome;
        this.cognome = cognome;
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

    public String getCognome() {
        return cognome;
    }

    public void setCognome(String cognome) {
        this.cognome = cognome;
    }

    public String getUrlImmagine() {
        return urlImmagine;
    }

    public void setUrlImmagine(String urlImmagine) {
        this.urlImmagine = urlImmagine;
    }
}
