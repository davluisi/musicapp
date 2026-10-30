package com.musicapp.service;

import com.musicapp.entity.Album;
import com.musicapp.entity.Canzone;
import com.musicapp.repository.AlbumRepository;
import com.musicapp.repository.ArtistaRepository;
import com.musicapp.repository.CanzoneRepository;
import com.musicapp.repository.PlaylistRepository;
import com.musicapp.repository.UtenteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.S3Object;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
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
     * All'avvio dell'applicazione:
     * 1. Allinea retroattivamente tutte le canzoni appartenenti ad un album affinché usino lo stesso urlImmagine dell'album.
     * 2. Sposta eventuali immagini delle canzoni rimaste in 'canzoni/<file>' dentro la sottocartella 'canzoni/immagini/<file>'.
     * 3. Elimina da S3 tutte le vecchie immagini delle canzoni rimaste orfane.
     */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void runRetroactiveAlbumCoverSyncAndCleanup() {
        log.info("Avvio sincronizzazione retroattiva copertine album/canzoni e pulizia immagini orfane su S3...");
        try {
            List<Canzone> allCanzoni = canzoneRepository.findAll();
            Set<String> candidateOrphanImageUrls = new HashSet<>();
            int updatedAlbumCoversCount = 0;
            int movedToSubfolderCount = 0;

            for (Canzone canzone : allCanzoni) {
                Album album = canzone.getAlbum();
                String currentSongImg = canzone.getUrlImmagine();

                // Caso 1: La canzone appartiene ad un album che ha una copertina
                if (album != null && album.getUrlImmagine() != null && !album.getUrlImmagine().isBlank()) {
                    String albumImg = album.getUrlImmagine();
                    if (!albumImg.equals(currentSongImg)) {
                        if (currentSongImg != null && !currentSongImg.isBlank()) {
                            candidateOrphanImageUrls.add(currentSongImg);
                        }
                        canzone.setUrlImmagine(albumImg);
                        canzoneRepository.save(canzone);
                        updatedAlbumCoversCount++;
                    }
                }
                // Caso 2: La canzone ha una propria immagine salvata direttamente in "canzoni/<file>" (non in "canzoni/immagini/")
                else if (currentSongImg != null && !currentSongImg.isBlank()) {
                    String key = s3StorageService.extractKeyFromUrl(currentSongImg);
                    if (key != null && key.startsWith("canzoni/") && !key.startsWith("canzoni/audio/") && !key.startsWith("canzoni/immagini/")) {
                        String fileName = key.substring("canzoni/".length());
                        String newKey = "canzoni/immagini/" + fileName;
                        if (s3StorageService.moveObject(key, newKey)) {
                            canzone.setUrlImmagine(s3StorageService.buildUrlForKey(newKey));
                            canzoneRepository.save(canzone);
                            movedToSubfolderCount++;
                        }
                    }
                }
            }

            // Raccoglie tutte le chiavi S3 ancora referenziate dopo l'aggiornamento
            Set<String> activeKeys = getAllReferencedS3Keys();
            int deletedDirectOrphans = 0;

            // Elimina subito da S3 le vecchie copertine delle canzoni che sono state sostituite da quella dell'album
            for (String oldUrl : candidateOrphanImageUrls) {
                String oldKey = s3StorageService.extractKeyFromUrl(oldUrl);
                if (oldKey != null && !activeKeys.contains(oldKey)) {
                    log.info("Eliminazione immediata vecchia copertina canzone sostituita da quella dell'album: {}", oldKey);
                    s3StorageService.deleteFileByUrlOrKey(oldKey);
                    deletedDirectOrphans++;
                }
            }

            log.info("Sincronizzazione retroattiva completata: {} canzoni allineate alla copertina dell'album, {} immagini spostate in 'canzoni/immagini/', {} vecchie copertine duplicate rimosse.",
                    updatedAlbumCoversCount, movedToSubfolderCount, deletedDirectOrphans);

            // Esegue una scansione immediata del bucket S3 senza grace period per eliminare subito tutte le vecchie immagini rimaste orfane
            cleanupOrphanS3Objects(false);
        } catch (Exception e) {
            log.error("Errore durante la sincronizzazione retroattiva delle copertine: {}", e.getMessage(), e);
        }
    }

    /**
     * Esegue la pulizia periodica di tutti gli oggetti orfani su S3.
     * Programmato di default ogni ora (fixedDelay = 3600000 ms = 1h), con ritardo iniziale di 1 minuto.
     */
    @Scheduled(fixedDelay = 3600000, initialDelay = 60000)
    public void cleanupOrphanS3Objects() {
        cleanupOrphanS3Objects(true);
    }

    public void cleanupOrphanS3Objects(boolean useGracePeriod) {
        log.info("Avvio job di pulizia file orfani su S3 (bucket: {}, useGracePeriod: {})...", bucketName, useGracePeriod);
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

                    // Ignoriamo "directory markers" vuoti (chiavi che finiscono con "/") e l'APK dell'app
                    if (key.endsWith("/") || key.startsWith("apk/")) {
                        continue;
                    }

                    // Se useGracePeriod è true e il file è stato caricato negli ultimi 30 minuti, lo risparmiamo per consentire il completamento della form
                    if (useGracePeriod && s3Object.lastModified() != null && s3Object.lastModified().isAfter(graceThreshold)) {
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
