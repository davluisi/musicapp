package com.musicapp.repository;

import com.musicapp.entity.Canzone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CanzoneRepository extends JpaRepository<Canzone, Long> {
    boolean existsByUrlImmagineAndIdNot(String urlImmagine, Long id);
}
