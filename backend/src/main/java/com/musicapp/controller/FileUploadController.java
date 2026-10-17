package com.musicapp.controller;

import com.musicapp.dto.ApiResponse;
import com.musicapp.entity.Artista;
import com.musicapp.entity.Album;
import com.musicapp.repository.ArtistaRepository;
import com.musicapp.repository.AlbumRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/upload")
@CrossOrigin(origins = "*")
public class FileUploadController {

    public FileUploadController() {
        System.out.println("FileUploadController initialized");
    }

    @Autowired
    private S3Client s3Client;

    @Autowired
    private software.amazon.awssdk.services.s3.presigner.S3Presigner s3Presigner;

    @Autowired
    private ArtistaRepository artistaRepository;

    @Autowired
    private AlbumRepository albumRepository;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.s3.region}")
    private String region;

    @PostMapping("/image/{type}")
    public ResponseEntity<ApiResponse<String>> uploadImage(
            @PathVariable String type,
            @RequestParam("file") MultipartFile file) {
        try {
            String folder = getFolderForType(type);
            String fileName = folder + UUID.randomUUID() + "-" + file.getOriginalFilename();
            
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileName)
                    .contentType(file.getContentType())
                    .build();
            
            s3Client.putObject(putObjectRequest, software.amazon.awssdk.core.sync.RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            
            String fileUrl = "https://" + bucketName + ".s3." + region + ".amazonaws.com/" + fileName;
            
            return ResponseEntity.ok(new ApiResponse<>(fileUrl, "File caricato con successo", "success"));
        } catch (IOException e) {
            return ResponseEntity.status(500)
                    .body(new ApiResponse<>(null, "Errore durante il caricamento del file", "error"));
        }
    }

    @PostMapping("/youtube")
    public ResponseEntity<ApiResponse<com.musicapp.dto.YouTubeResponseDTO>> downloadFromYouTube(@RequestBody YouTubeRequest request) {
        System.out.println("YouTube download request received: " + request.getUrl());
        try {
            String tempDir = System.getProperty("java.io.tmpdir");
            String baseId = UUID.randomUUID().toString();
            String outputTemplate = Paths.get(tempDir, baseId + ".%(ext)s").toString();
            Path audioExpectedPath = Paths.get(tempDir, baseId + ".m4a");
            
            System.out.println("Output template: " + outputTemplate);
            
            // Rileva eseguibile yt-dlp e node in base al sistema operativo (Linux/Docker vs Windows)
            boolean isWindows = System.getProperty("os.name", "").toLowerCase().contains("win");
            String ytDlpCmd = isWindows 
                ? "C:\\Users\\david\\AppData\\Local\\Python\\pythoncore-3.14-64\\Scripts\\yt-dlp.exe" 
                : "yt-dlp";
            String nodeCmd = isWindows 
                ? "node:C:\\nvm4w\\nodejs\\node.exe" 
                : "node";

            // Controlla presenza cookies.txt
            java.io.File cookiesFile = new java.io.File("/app/cookies.txt");
            if (!cookiesFile.exists()) {
                cookiesFile = new java.io.File("cookies.txt");
            }
            boolean hasCookies = cookiesFile.exists() && cookiesFile.length() > 0;
            System.out.println("Using cookies: " + hasCookies);

            // 1. Estrai metadati video con yt-dlp --print
            String extractedTitle = null;
            String uploadDate = null;
            String description = null;
            try {
                java.util.List<String> metaCmdList = new java.util.ArrayList<>(java.util.List.of(
                    ytDlpCmd,
                    "--js-runtimes", nodeCmd,
                    "--print", "%(title)s|%(upload_date)s|%(description)s"
                ));
                if (hasCookies) {
                    metaCmdList.add("--cookies");
                    metaCmdList.add(cookiesFile.getAbsolutePath());
                    metaCmdList.add("--no-write-cookies");
                } else {
                    metaCmdList.add("--extractor-args");
                    metaCmdList.add("youtube:player_client=android,web");
                }
                metaCmdList.add(request.getUrl());

                ProcessBuilder metaPb = new ProcessBuilder(metaCmdList);
                Process metaProc = metaPb.start();
                String metaOut = new String(metaProc.getInputStream().readAllBytes()).trim();
                metaProc.waitFor(15, TimeUnit.SECONDS);
                if (metaProc.exitValue() == 0 && !metaOut.isBlank()) {
                    String[] parts = metaOut.split("\\|", 3);
                    if (parts.length >= 1) extractedTitle = parts[0].trim();
                    if (parts.length >= 2 && !parts[1].isBlank()) uploadDate = parts[1].trim();
                    if (parts.length >= 3) description = parts[2].trim();
                }
            } catch (Exception te) {
                System.out.println("Could not extract metadata: " + te.getMessage());
            }

            // 2. Scarica audio e thumbnail
            java.util.List<String> dlCmdList = new java.util.ArrayList<>(java.util.List.of(
                ytDlpCmd,
                "--js-runtimes", nodeCmd,
                "--retries", "5",
                "--fragment-retries", "5",
                "-f", "bestaudio/best",
                "--write-thumbnail",
                "-o", outputTemplate
            ));
            if (hasCookies) {
                dlCmdList.add("--cookies");
                dlCmdList.add(cookiesFile.getAbsolutePath());
                dlCmdList.add("--no-write-cookies");
            } else {
                dlCmdList.add("--extractor-args");
                dlCmdList.add("youtube:player_client=android,ios,web");
            }
            dlCmdList.add(request.getUrl());

            ProcessBuilder processBuilder = new ProcessBuilder(dlCmdList);
            
            System.out.println("Starting yt-dlp download process...");
            Process process = processBuilder.start();
            
            String processStdout = new String(process.getInputStream().readAllBytes());
            String processStderr = new String(process.getErrorStream().readAllBytes());

            boolean completed = process.waitFor(5, TimeUnit.MINUTES);
            
            if (!completed) {
                process.destroyForcibly();
                System.out.println("Timeout during download");
                return ResponseEntity.status(500)
                        .body(new ApiResponse<>(null, "Timeout durante il download", "error"));
            }
            
            if (process.exitValue() != 0) {
                System.out.println("yt-dlp exited with error code: " + process.exitValue());
                System.out.println("yt-dlp stderr: " + processStderr);
                String errorMsg = processStderr.isBlank() ? "Codice errore: " + process.exitValue() : processStderr;
                return ResponseEntity.status(500)
                        .body(new ApiResponse<>(null, "Errore YouTube: " + errorMsg, "error"));
            }
            
            System.out.println("Download completed successfully. Searching for files...");
            
            // Cerca file audio generato
            File audioFile = audioExpectedPath.toFile();
            if (!audioFile.exists()) {
                // fallback di ricerca per estensione se diversa da m4a
                File dir = new File(tempDir);
                File[] matchingAudio = dir.listFiles((d, name) -> name.startsWith(baseId) && (name.endsWith(".m4a") || name.endsWith(".webm") || name.endsWith(".opus") || name.endsWith(".mp3")));
                if (matchingAudio != null && matchingAudio.length > 0) {
                    audioFile = matchingAudio[0];
                }
            }

            if (!audioFile.exists()) {
                System.out.println("Audio file not found after download");
                return ResponseEntity.status(500)
                        .body(new ApiResponse<>(null, "File audio non scaricato", "error"));
            }
            
            String audioS3Key = "canzoni/audio/" + UUID.randomUUID() + "-" + audioFile.getName();
            String audioContentType = audioFile.getName().endsWith(".webm") ? "audio/webm" : (audioFile.getName().endsWith(".mp3") ? "audio/mpeg" : "audio/mp4");
            PutObjectRequest audioPutRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(audioS3Key)
                    .contentType(audioContentType)
                    .build();
            
            System.out.println("Uploading audio to S3: " + audioS3Key + " (" + audioContentType + ")");
            s3Client.putObject(audioPutRequest, software.amazon.awssdk.core.sync.RequestBody.fromInputStream(Files.newInputStream(audioFile.toPath()), audioFile.length()));
            Files.deleteIfExists(audioFile.toPath());
            
            String audioUrl = "https://" + bucketName + ".s3." + region + ".amazonaws.com/" + audioS3Key;
            
            // Cerca file thumbnail generato (.jpg o .webp o .png)
            String imageUrl = null;
            File dir = new File(tempDir);
            File[] matchingThumb = dir.listFiles((d, name) -> name.startsWith(baseId) && (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp") || name.endsWith(".png")));
            
            if (matchingThumb != null && matchingThumb.length > 0) {
                File thumbFile = matchingThumb[0];
                try {
                    String ext = thumbFile.getName().contains(".") ? thumbFile.getName().substring(thumbFile.getName().lastIndexOf(".")) : ".jpg";
                    String contentType = ext.equalsIgnoreCase(".webp") ? "image/webp" : (ext.equalsIgnoreCase(".png") ? "image/png" : "image/jpeg");
                    String imgS3Key = "canzoni/" + UUID.randomUUID() + ext;
                    PutObjectRequest imgPutRequest = PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(imgS3Key)
                            .contentType(contentType)
                            .build();
                    
                    System.out.println("Uploading thumbnail to S3: " + imgS3Key + " (" + contentType + ")");
                    s3Client.putObject(imgPutRequest, software.amazon.awssdk.core.sync.RequestBody.fromInputStream(Files.newInputStream(thumbFile.toPath()), thumbFile.length()));
                    imageUrl = "https://" + bucketName + ".s3." + region + ".amazonaws.com/" + imgS3Key;
                } catch (Exception ex) {
                    System.err.println("Could not upload thumbnail: " + ex.getMessage());
                } finally {
                    for (File f : matchingThumb) {
                        Files.deleteIfExists(f.toPath());
                    }
                }
            }

            // Estrai anno dalla data di upload YouTube (formato YYYYMMDD)
            Integer extractedYear = null;
            if (uploadDate != null && uploadDate.length() >= 4) {
                try {
                    extractedYear = Integer.parseInt(uploadDate.substring(0, 4));
                } catch (NumberFormatException e) {
                    System.out.println("Could not parse year from upload date: " + uploadDate);
                }
            }

            // Cerca corrispondenze nel database per artista e album
            String matchedArtist = null;
            String matchedAlbum = null;

            if (extractedTitle != null || description != null) {
                String searchText = (extractedTitle + " " + (description != null ? description : "")).toLowerCase();

                // Cerca artista
                List<Artista> allArtists = artistaRepository.findAll();
                for (Artista artist : allArtists) {
                    if (searchText.contains(artist.getNome().toLowerCase())) {
                        matchedArtist = artist.getNome();
                        break;
                    }
                }

                // Cerca album
                List<Album> allAlbums = albumRepository.findAll();
                for (Album album : allAlbums) {
                    if (searchText.contains(album.getNome().toLowerCase())) {
                        matchedAlbum = album.getNome();
                        break;
                    }
                }
            }

            com.musicapp.dto.YouTubeResponseDTO responseDTO = com.musicapp.dto.YouTubeResponseDTO.builder()
                    .audioUrl(audioUrl)
                    .imageUrl(imageUrl)
                    .title(extractedTitle)
                    .year(extractedYear)
                    .artist(matchedArtist)
                    .album(matchedAlbum)
                    .build();

            return ResponseEntity.ok(new ApiResponse<>(responseDTO, "Traccia e copertina estratte con successo da YouTube", "success"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(new ApiResponse<>(null, "Errore: " + e.getMessage(), "error"));
        }
    }

    @GetMapping("/stream")
    public ResponseEntity<byte[]> streamFile(@RequestParam("key") String key) {
        try {
            software.amazon.awssdk.services.s3.model.GetObjectRequest getObjectRequest = software.amazon.awssdk.services.s3.model.GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();

            software.amazon.awssdk.core.ResponseBytes<software.amazon.awssdk.services.s3.model.GetObjectResponse> objectBytes = s3Client.getObjectAsBytes(getObjectRequest);
            byte[] data = objectBytes.asByteArray();
            String contentType = objectBytes.response().contentType();
            if (contentType == null || contentType.isBlank()) {
                if (key.endsWith(".m4a")) contentType = "audio/mp4";
                else if (key.endsWith(".webm")) contentType = "audio/webm";
                else if (key.endsWith(".mp3")) contentType = "audio/mpeg";
                else if (key.endsWith(".webp")) contentType = "image/webp";
                else if (key.endsWith(".jpg") || key.endsWith(".jpeg")) contentType = "image/jpeg";
                else if (key.endsWith(".png")) contentType = "image/png";
                else contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .header("Content-Type", contentType)
                    .header("Content-Length", String.valueOf(data.length))
                    .header("Accept-Ranges", "bytes")
                    .header("Cache-Control", "public, max-age=86400")
                    .body(data);
        } catch (Exception e) {
            System.err.println("Error streaming S3 object " + key + ": " + e.getMessage());
            return ResponseEntity.status(404).build();
        }
    }

    private String getFolderForType(String type) {
        return switch (type.toLowerCase()) {
            case "artista" -> "artisti/";
            case "album" -> "album/";
            case "canzone" -> "canzoni/";
            case "utente" -> "utenti/";
            default -> "other/";
        };
    }

    public static class YouTubeRequest {
        private String url;

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }
    }
}
