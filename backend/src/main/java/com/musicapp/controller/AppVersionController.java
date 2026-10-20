package com.musicapp.controller;

import com.musicapp.dto.ApiResponse;
import com.musicapp.dto.AppVersionDto;
import com.musicapp.entity.AppVersion;
import com.musicapp.repository.AppVersionRepository;
import com.musicapp.service.S3StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.InputStream;
import java.util.Optional;

@RestController
@RequestMapping("/app")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class AppVersionController {

    private final AppVersionRepository appVersionRepository;
    private final S3Client s3Client;
    private final S3StorageService s3StorageService;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    private static final String APK_S3_KEY = "apk/spotifai-latest.apk";

    /**
     * Restituisce le informazioni sull'ultima versione disponibile dell'applicazione.
     */
    @GetMapping("/version")
    public ResponseEntity<ApiResponse<AppVersionDto>> getLatestVersion() {
        Optional<AppVersion> latestOpt = appVersionRepository.findTopByOrderByCreatedAtDesc();
        if (latestOpt.isEmpty()) {
            AppVersionDto fallback = AppVersionDto.builder()
                    .version("1.0.0")
                    .apkUrl("/app/download")
                    .releaseNotes("Nessun aggiornamento disponibile")
                    .mandatory(false)
                    .build();
            return ResponseEntity.ok(ApiResponse.success(fallback, "Versione recuperata"));
        }

        AppVersion latest = latestOpt.get();
        AppVersionDto dto = AppVersionDto.builder()
                .version(latest.getVersion())
                .apkUrl(latest.getApkUrl())
                .releaseNotes(latest.getReleaseNotes())
                .mandatory(latest.getMandatory())
                .build();

        return ResponseEntity.ok(ApiResponse.success(dto, "Versione recuperata"));
    }

    /**
     * Endpoint per scaricare l'APK direttamente da S3 (in streaming come allegato).
     */
    @GetMapping("/download")
    public ResponseEntity<byte[]> downloadLatestApk() {
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(APK_S3_KEY)
                    .build();

            ResponseBytes<GetObjectResponse> objectBytes = s3Client.getObjectAsBytes(getObjectRequest);
            byte[] data = objectBytes.asByteArray();

            return ResponseEntity.ok()
                    .header("Content-Type", "application/vnd.android.package-archive")
                    .header("Content-Disposition", "attachment; filename=\"spotifai.apk\"")
                    .header("Content-Length", String.valueOf(data.length))
                    .body(data);
        } catch (Exception e) {
            log.error("Errore durante il download dell'APK da S3: {}", e.getMessage());
            return ResponseEntity.status(404).build();
        }
    }

    /**
     * Endpoint per caricare una nuova versione dell'APK.
     * Sovrascrive/cancella automaticamente il file APK precedente su S3 senza sprecare memoria!
     */
    @PostMapping("/upload-apk")
    public ResponseEntity<ApiResponse<AppVersionDto>> uploadNewApk(
            @RequestParam("file") MultipartFile file,
            @RequestParam("version") String version,
            @RequestParam(value = "releaseNotes", required = false) String releaseNotes,
            @RequestParam(value = "mandatory", defaultValue = "false") Boolean mandatory) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Il file APK non può essere vuoto"));
        }

        try {
            // Elimina preventivamente la vecchia chiave se presente (anche se putObject sovrascriverebbe)
            s3StorageService.deleteFileByUrlOrKey(APK_S3_KEY);

            log.info("Caricamento nuovo APK versione {} su S3: bucket={}, key={}", version, bucketName, APK_S3_KEY);
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(APK_S3_KEY)
                    .contentType("application/vnd.android.package-archive")
                    .build();

            try (InputStream is = file.getInputStream()) {
                s3Client.putObject(putRequest, RequestBody.fromInputStream(is, file.getSize()));
            }

            // Salva / aggiorna versione nel database
            AppVersion appVersion = AppVersion.builder()
                    .version(version)
                    .apkUrl("/app/download")
                    .releaseNotes(releaseNotes != null ? releaseNotes : "Nuova versione disponibile")
                    .mandatory(mandatory)
                    .build();

            AppVersion saved = appVersionRepository.save(appVersion);

            AppVersionDto dto = AppVersionDto.builder()
                    .version(saved.getVersion())
                    .apkUrl(saved.getApkUrl())
                    .releaseNotes(saved.getReleaseNotes())
                    .mandatory(saved.getMandatory())
                    .build();

            return ResponseEntity.ok(ApiResponse.success(dto, "APK caricato con successo"));
        } catch (Exception e) {
            log.error("Errore durante l'upload dell'APK: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(ApiResponse.error("Errore durante il caricamento: " + e.getMessage()));
        }
    }

    /**
     * Endpoint per registrare / notificare una nuova versione senza dover ricaricare l'APK via Nginx.
     * Utile se l'APK è già presente su S3 o su un hosting esterno (es. EAS Artifacts).
     */
    @PostMapping("/register-version")
    public ResponseEntity<ApiResponse<AppVersionDto>> registerVersion(
            @RequestParam("version") String version,
            @RequestParam(value = "apkUrl", required = false) String apkUrl,
            @RequestParam(value = "releaseNotes", required = false) String releaseNotes,
            @RequestParam(value = "mandatory", defaultValue = "false") Boolean mandatory) {

        AppVersion appVersion = AppVersion.builder()
                .version(version)
                .apkUrl(apkUrl != null && !apkUrl.isBlank() ? apkUrl : "/app/download")
                .releaseNotes(releaseNotes != null ? releaseNotes : "Nuova versione disponibile")
                .mandatory(mandatory)
                .build();

        AppVersion saved = appVersionRepository.save(appVersion);

        AppVersionDto dto = AppVersionDto.builder()
                .version(saved.getVersion())
                .apkUrl(saved.getApkUrl())
                .releaseNotes(saved.getReleaseNotes())
                .mandatory(saved.getMandatory())
                .build();

        return ResponseEntity.ok(ApiResponse.success(dto, "Versione registrata con successo"));
    }
}
