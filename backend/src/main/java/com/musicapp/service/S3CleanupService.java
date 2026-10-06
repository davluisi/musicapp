package com.musicapp.service;

import com.musicapp.repository.AlbumRepository;
import com.musicapp.repository.ArtistaRepository;
import com.musicapp.repository.CanzoneRepository;
import com.musicapp.repository.PlaylistRepository;
import com.musicapp.repository.UtenteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.S3Object;

import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class S3CleanupService {

    private final S3Client s3Client;
    private final S3StorageService s3StorageService;

    private final AlbumRepository albumRepository;
    private final ArtistaRepository artistaRepository;
    private final CanzoneRepository canzoneRepository;
    private final PlaylistRepository playlistRepository;
    private final UtenteRepository utenteRepository;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    /**
     * Esegue la pulizia periodica di tutti gli oggetti orfani su S3.
     * Programmato di default ogni ora (fixedDelay = 3600000 ms = 1h), con ritardo iniziale di 1 minuto.
     */
    @Scheduled(fixedDelay = 3600000, initialDelay = 60000)
    public void cleanupOrphanS3Objects() {
        log.info("Avvio job di pulizia file orfani su S3 (bucket: {})...", bucketName);
        try {
            // 1. Raccoglie tutte le chiavi S3 attualmente referenziate nel Database
            Set<String> referencedKeys = getAllReferencedS3Keys();
            log.info("Trovate {} risorse referenziate attive nel database.", referencedKeys.size());

            // 2. Itera su tutti gli oggetti presenti nel bucket S3
            String continuationToken = null;
            int scannedCount = 0;
            int deletedCount = 0;
            Instant graceThreshold = Instant.now().minus(Duration.ofMinutes(30)); // 30 min di periodo di grazia per file appena caricati ma non ancora salvati nel DB

            do {
                ListObjectsV2Request request = ListObjectsV2Request.builder()
                        .bucket(bucketName)
                        .continuationToken(continuationToken)
                        .build();

                ListObjectsV2Response response = s3Client.listObjectsV2(request);
                for (S3Object s3Object : response.contents()) {
                    scannedCount++;
                    String key = s3Object.key();

                    // Ignoriamo "directory markers" vuoti (chiavi che finiscono con "/")
                    if (key.endsWith("/")) {
                        continue;
                    }

                    // Se il file è stato caricato negli ultimi 30 minuti, lo risparmiamo per consentire il completamento della form
                    if (s3Object.lastModified() != null && s3Object.lastModified().isAfter(graceThreshold)) {
                        continue;
                    }

                    // Se non è referenziato in nessuna entità, lo eliminiamo
                    if (!referencedKeys.contains(key)) {
                        log.warn("Trovato oggetto S3 orfano: '{}' (creato {}) - eliminazione in corso...", key, s3Object.lastModified());
                        s3StorageService.deleteFileByUrlOrKey(key);
                        deletedCount++;
                    }
                }

                continuationToken = response.nextContinuationToken();
            } while (continuationToken != null);

            log.info("Job pulizia S3 completato: scansionati {} oggetti, eliminati {} orfani.", scannedCount, deletedCount);
        } catch (Exception e) {
            log.error("Errore durante l'esecuzione del job di pulizia S3: {}", e.getMessage(), e);
        }
    }

    /**
     * Raccoglie tutte le S3 keys utilizzate da Canzoni, Album, Artisti, Playlist e Utenti.
     */
    public Set<String> getAllReferencedS3Keys() {
        Set<String> keys = new HashSet<>();

        // Canzoni: audio e immagine
        canzoneRepository.findAll().forEach(canzone -> {
            addKey(keys, canzone.getUrlFileAudio());
            addKey(keys, canzone.getUrlImmagine());
        });

        // Album: immagine
        albumRepository.findAll().forEach(album -> {
            addKey(keys, album.getUrlImmagine());
        });

        // Artisti: immagine
        artistaRepository.findAll().forEach(artista -> {
            addKey(keys, artista.getUrlImmagine());
        });

        // Playlist: immagine
        playlistRepository.findAll().forEach(playlist -> {
            addKey(keys, playlist.getUrlImmagine());
        });

        // Utenti: immagine profilo
        utenteRepository.findAll().forEach(utente -> {
            addKey(keys, utente.getUrlImmagineProfilo());
        });

        return keys;
    }

    private void addKey(Set<String> keys, String urlOrKey) {
        String key = s3StorageService.extractKeyFromUrl(urlOrKey);
        if (key != null && !key.isBlank()) {
            keys.add(key);
        }
    }
}
