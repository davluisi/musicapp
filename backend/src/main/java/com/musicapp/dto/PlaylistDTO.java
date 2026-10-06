package com.musicapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlaylistDTO {
    private Long id;
    private String nome;
    private String urlImmagine;
    private Long utenteId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
