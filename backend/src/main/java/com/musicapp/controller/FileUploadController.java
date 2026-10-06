package com.musicapp.controller;

import com.musicapp.dto.ApiResponse;
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
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/upload")
@CrossOrigin(origins = "*")
public class FileUploadController {

    public FileUploadController() {
        System.out.println("FileUploadController initialized");
    }

    @Autowired
    private S3Client s3Client;

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
    public ResponseEntity<ApiResponse<String>> downloadFromYouTube(@RequestBody YouTubeRequest request) {
        System.out.println("YouTube download request received: " + request.getUrl());
        try {
            String tempDir = System.getProperty("java.io.tmpdir");
            String outputFileName = UUID.randomUUID() + ".m4a";
            Path outputPath = Paths.get(tempDir, outputFileName);
            
            System.out.println("Output path: " + outputPath);
            
            // Esegui yt-dlp per scaricare l'audio
            ProcessBuilder processBuilder = new ProcessBuilder(
                "C:\\Users\\david\\AppData\\Local\\Python\\pythoncore-3.14-64\\Scripts\\yt-dlp.exe",
                "-f", // Format selection
                "bestaudio",
                "-o", outputPath.toString(),
                request.getUrl()
            );
            
            System.out.println("Starting yt-dlp process...");
            Process process = processBuilder.start();
            boolean completed = process.waitFor(5, TimeUnit.MINUTES);
            
            if (!completed) {
                process.destroyForcibly();
                System.out.println("Timeout during download");
                return ResponseEntity.status(500)
                        .body(new ApiResponse<>(null, "Timeout durante il download", "error"));
            }
            
            if (process.exitValue() != 0) {
                System.out.println("yt-dlp exited with error code: " + process.exitValue());
                return ResponseEntity.status(500)
                        .body(new ApiResponse<>(null, "Errore durante il download da YouTube", "error"));
            }
            
            System.out.println("Download completed successfully");
            
            // Carica il file scaricato su S3
            File downloadedFile = outputPath.toFile();
            if (!downloadedFile.exists()) {
                System.out.println("File not found after download");
                return ResponseEntity.status(500)
                        .body(new ApiResponse<>(null, "File non scaricato", "error"));
            }
            
            String s3FileName = "canzoni/audio/" + UUID.randomUUID() + ".m4a";
            
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3FileName)
                    .contentType("audio/mp4")
                    .build();
            
            System.out.println("Uploading to S3: " + s3FileName);
            s3Client.putObject(putObjectRequest, software.amazon.awssdk.core.sync.RequestBody.fromInputStream(Files.newInputStream(downloadedFile.toPath()), downloadedFile.length()));
            
            // Cancella il file temporaneo
            Files.deleteIfExists(outputPath);
            
            String fileUrl = "https://" + bucketName + ".s3." + region + ".amazonaws.com/" + s3FileName;
            
            System.out.println("Upload completed: " + fileUrl);
            return ResponseEntity.ok(new ApiResponse<>(fileUrl, "Audio scaricato con successo", "success"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(new ApiResponse<>(null, "Errore: " + e.getMessage(), "error"));
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
