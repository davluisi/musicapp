package com.musicapp.repository;

import com.musicapp.entity.Playlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlaylistRepository extends JpaRepository<Playlist, Long> {
    List<Playlist> findByUtenteIdOrderByCreatedAtDesc(Long utenteId);

    @org.springframework.data.jpa.repository.Query("SELECT p.id FROM Playlist p JOIN p.canzoni c WHERE c.id = :canzoneId AND p.utente.id = :utenteId")
    List<Long> findPlaylistIdsByCanzoneIdAndUtenteId(@org.springframework.data.repository.query.Param("canzoneId") Long canzoneId, @org.springframework.data.repository.query.Param("utenteId") Long utenteId);
}
