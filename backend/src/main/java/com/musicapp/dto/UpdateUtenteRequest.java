package com.musicapp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUtenteRequest {

    private String nome;

    private String cognome;

    @Email(message = "Formato email non valido")
    private String email;

    private String urlImmagineProfilo;
}
