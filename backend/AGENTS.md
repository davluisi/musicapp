# Backend - Spring Boot Architecture & Context

Questo documento contiene la mappa concettuale e tecnica del modulo **backend**.
Consultare questo file per evitare scansioni o esplorazioni ricorsive delle directory Java.

---

## 1. Stack Tecnologico & Struttura Cartelle
- **Linguaggio**: Java 17+
- **Framework**: Spring Boot 3.x, Spring Data JPA, Spring Security, Spring Cloud AWS S3
- **Database**: PostgreSQL (gestito tramite Docker Compose su porta `5432`)
- **Migrazioni**: Liquibase (`backend/src/main/resources/db/`)
- **Build tool**: Maven (`pom.xml`)

### Struttura Package (`backend/src/main/java/com/musicapp/`):
```text
com.musicapp/
├── config/
│   ├── S3Config.java              # Configurazione client AWS S3
│   └── SecurityConfig.java        # SecurityFilterChain, CORS, BCrypt, endpoint pubblici/protetti
├── controller/
│   ├── AlbumController.java       # CRUD Album (/api/v1/album)
│   ├── AppVersionController.java  # Controllo e caricamento versioni APK (/api/v1/app)
│   ├── ArtistaController.java     # CRUD Artisti (/api/v1/artisti)
│   ├── AuthController.java        # Login, registrazione e gestione utente (/api/v1/auth)
│   ├── CanzoneController.java     # CRUD Canzoni, stream, YouTube fetch (/api/v1/canzoni)
│   ├── FileUploadController.java  # Upload file generici/S3 (/api/v1/files)
│   └── PlaylistController.java    # CRUD Playlist & gestione tracce (/api/v1/playlists)
├── dto/
│   ├── ApiResponse.java           # Wrapper standard per tutti gli endpoint: { success, data, message, status }
│   ├── AlbumDTO.java, ArtistaDTO.java, CanzoneDTO.java, PlaylistDTO.java, UtenteDTO.java
│   ├── LoginRequest.java, RegisterRequest.java, UpdateUtenteRequest.java
│   └── AppVersionDto.java, YouTubeResponseDTO.java
├── entity/
│   ├── Album.java, Artista.java, Canzone.java, Playlist.java, Utente.java, AppVersion.java
├── repository/
│   ├── AlbumRepository.java, ArtistaRepository.java, CanzoneRepository.java
│   ├── PlaylistRepository.java, UtenteRepository.java, AppVersionRepository.java
└── service/
    ├── AlbumService.java          # Logica business album
    ├── ArtistaService.java        # Logica business artisti
    ├── AuthService.java           # Registrazione, autenticazione, BCrypt password
    ├── CanzoneService.java        # Logica canzoni, associazione album/artisti, sync metadati
    ├── PlaylistService.java       # Logica playlist e tracce
    ├── S3StorageService.java      # Upload, download, presigned URL, rimozione file su AWS S3
    └── S3CleanupService.java      # Manutenzione e pulizia file orfani/vecchi su S3
```

---

## 2. Regole di Sviluppo Backend

1. **DTO & Risposte**:
   - Non esporre mai le Entity direttamente nei Controller.
   - Tutti gli endpoint restituiscono `ResponseEntity<ApiResponse<T>>`.
   - I DTO usano Lombok (`@Data`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`).

2. **Database & Liquibase**:
   - **Tutte** le modifiche schema devono essere inserite come nuovo changeset XML incrementale in `backend/src/main/resources/db/` e referenziate in `db.changelog-master.xml`.
   - MAI modificare changeset già applicati/committati.
   - Usare `addColumn` o script mirati per modifiche di colonne.

3. **Storage S3 (`musicapp-017719539384-eu-south-1-an`)**:
   - Convenzione path file: `{tipo}/{id}/{filename}` (es. `audio/12/canzone.mp3`, `profile/3/avatar.jpg`, `apk/spotifai-latest.apk`).
   - All'aggiornamento o eliminazione di file (audio, copertina o APK), chiamare il servizio di rimozione su S3 per evitare spreco di memoria.

4. **Comandi Utili**:
   - Build rapida: `mvn clean package -DskipTests` (nella cartella `backend`)
   - Esecuzione locale: `mvn spring-boot:run`

