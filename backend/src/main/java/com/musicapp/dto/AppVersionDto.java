package com.musicapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppVersionDto {
    private String version;
    private String apkUrl;
    private String releaseNotes;
    private Boolean mandatory;
}
