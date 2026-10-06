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
public class UtenteDTO {
    private Long id;
    private String nome;
    private String cognome;
    private String email;
    private String urlImmagineProfilo;
    private LocalDateTime createdAt;
}
