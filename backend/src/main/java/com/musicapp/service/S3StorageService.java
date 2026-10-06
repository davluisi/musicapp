package com.musicapp.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;

@Service
@RequiredArgsConstructor
@Slf4j
public class S3StorageService {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    /**
     * Estrae la chiave S3 da un URL completo di S3 o restituisce la stringa se è già una chiave.
     */
    public String extractKeyFromUrl(String urlOrKey) {
        if (urlOrKey == null || urlOrKey.isBlank()) {
            return null;
        }
        if (urlOrKey.contains(".amazonaws.com/")) {
            return urlOrKey.substring(urlOrKey.indexOf(".amazonaws.com/") + ".amazonaws.com/".length());
        }
        // Se contiene parametri di query o stream
        if (urlOrKey.contains("key=")) {
            int keyIndex = urlOrKey.indexOf("key=") + 4;
            int ampIndex = urlOrKey.indexOf("&", keyIndex);
            return ampIndex != -1 ? urlOrKey.substring(keyIndex, ampIndex) : urlOrKey.substring(keyIndex);
        }
        return urlOrKey;
    }

    /**
     * Elimina un oggetto da S3 dato il suo URL o la sua S3 key.
     */
    public void deleteFileByUrlOrKey(String urlOrKey) {
        String key = extractKeyFromUrl(urlOrKey);
        if (key == null || key.isBlank()) {
            return;
        }
        try {
            log.info("Eliminazione oggetto S3: bucket={}, key={}", bucketName, key);
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build());
        } catch (Exception e) {
            log.error("Errore durante l'eliminazione da S3 dell'oggetto {}: {}", key, e.getMessage());
        }
    }
}
