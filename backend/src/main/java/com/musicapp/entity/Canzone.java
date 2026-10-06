package com.musicapp.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "canzone")
public class Canzone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "url_file_audio", nullable = false)
    private String urlFileAudio;

    @Column(name = "anno")
    private Integer anno;

    @Column(name = "url_immagine")
    private String urlImmagine;

    @ManyToMany
    @JoinTable(
            name = "canzone_artista",
            joinColumns = @JoinColumn(name = "canzone_id"),
            inverseJoinColumns = @JoinColumn(name = "artista_id")
    )
    private Set<Artista> artisti = new HashSet<>();

    @ManyToOne
    @JoinColumn(name = "album_id")
    private Album album;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public Set<Artista> getArtisti() {
        return artisti;
    }

    public void setArtisti(Set<Artista> artisti) {
        this.artisti = artisti;
    }

    public Album getAlbum() {
        return album;
    }

    public void setAlbum(Album album) {
        this.album = album;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
