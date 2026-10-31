# MusicApp (Spotifai) - Guida & Indice Globale del Progetto

Questo file è il punto di ingresso per il contesto del workspace. Viene caricato automaticamente per evitare all'assistente di scansionare ripetutamente directory, perdere token o fare ricerche dispersive nel codebase.

---

## 🧭 Mappa Rapida dei Moduli e File di Contesto
Per informazioni dettagliate su ciascuna componente, fare riferimento direttamente ai file dedicati:
- **Backend (Spring Boot & DB)**: [backend/AGENTS.md](file:///c:/Progetti/musicapp/backend/AGENTS.md)
- **Frontend (Expo & React Native)**: [frontend/AGENTS.md](file:///c:/Progetti/musicapp/frontend/AGENTS.md)

---

## 📁 Mappa Completa dei File del Progetto

```text
musicapp/
├── AGENTS.md                                # Contesto globale e indice del workspace (questo file)
├── docker-compose.yml                       # Container PostgreSQL (porta 5432)
│
├── backend/                                 # Modulo Backend Spring Boot
│   ├── AGENTS.md                            # Dettagli architettura backend, convenzioni e servizi
│   ├── pom.xml                              # Dipendenze Maven (Spring Boot 3, AWS S3, Liquibase, PostgreSQL)
│   ├── Dockerfile                           # Immagine Docker di produzione per il backend
│   └── src/main/
│       ├── resources/
│       │   ├── application.yml              # Configurazione DB, porta server, AWS S3, security
│       │   └── db/                          # Migrazioni Liquibase
│       │       ├── db.changelog-master.xml  # Master changelog che include tutte le migrazioni
│       │       └── db.changelog-*.xml       # Tabelle: utente, artista, canzone, album, playlist, app_version
│       └── java/com/musicapp/
│           ├── MusicAppApplication.java     # Main Spring Boot
│           ├── config/                      # S3Config.java, SecurityConfig.java
│           ├── controller/                  # Album, AppVersion, Artista, Auth, Canzone, FileUpload, Playlist
│           ├── dto/                         # ApiResponse.java (wrapper), AlbumDTO, CanzoneDTO, ecc.
│           ├── entity/                      # JPA Entities (Utente, Artista, Canzone, Album, Playlist, AppVersion)
│           ├── repository/                  # Spring Data JPA Repositories
│           └── service/                     # AlbumService, ArtistaService, AuthService, CanzoneService,
│                                            # PlaylistService, S3StorageService, S3CleanupService
│
└── frontend/                                # Modulo Frontend Mobile (Expo / React Native)
    ├── AGENTS.md                            # Dettagli architettura frontend, stato audio e componenti
    ├── App.tsx                              # Entry point, Tab Navigation, provider di stato, UpdateModal
    ├── app.json                             # Configurazione Expo (versione app, bundleIdentifier, icone)
    ├── package.json                         # Dipendenze React Native, Expo, Axios, Track Player / AV
    ├── components/
    │   ├── AlbumDetailModal.tsx             # Modale visualizzazione album con tracce
    │   ├── GlobalMiniPlayer.tsx             # Player persistente a fondo schermo con traccia corrente
    │   └── UpdateModal.tsx                  # Modale per notifica e download/installazione APK da S3
    ├── screens/
    │   ├── SongsScreen.tsx                  # Brani, player trigger, filtri, upload brani
    │   ├── AlbumsScreen.tsx                 # Schermata album e aperture modali
    │   ├── ArtistsScreen.tsx                # Schermata artisti
    │   ├── PlaylistsScreen.tsx              # Schermata playlist e aggiunta tracce
    │   └── ProfileScreen.tsx                # Profilo utente, cambio password e avatar
    └── services/
        ├── api.ts                           # Client Axios centralizzato per tutti gli endpoint REST
        ├── AudioContext.tsx                 # Context globale per riproduzione audio, coda, pause/resume
        ├── AuthContext.tsx                  # Context autenticazione utente e token
        ├── DialogContext.tsx                # Dialog e conferme personalizzate UI
        ├── navigation.ts                    # Utility navigazione
        └── theme.ts                         # Palette colori scura stile Spotify (#121212, #1DB954)
```

---

## ⚙️ Regole di Sviluppo & Convenzioni Chiave

### 1. Backend & Database
- **API Base**: `/api/v1`
- **Tutte le risposte API** usano il formato wrapper `ApiResponse<T>` (`data`, `message`, `status`).
- **Nessuna Entity esposta direttamente**: passare sempre per DTO nei controller e mappare nei Service. Tutti i DTO hanno annotazioni Lombok (`@Data`, `@NoArgsConstructor`, `@AllArgsConstructor`).
- **Database & Migrazioni (Liquibase)**:
  - Tutte le modifiche al DB devono passare da Liquibase in `src/main/resources/db/`.
  - ID incrementali: `db.changelog-001-...` fino all'ultimo presente. MAI modificare changelog già committati.
  - Per modifiche (es. nuove colonne): creare un nuovo changelog con `addColumn` (NON usare `runOnChange="true"` su tabelle).
  - Aggiungere sempre il nuovo file in `db.changelog-master.xml`.
- **AWS S3 Storage**:
  - Bucket: `musicapp-017719539384-eu-south-1-an` (region: `eu-south-1`).
  - Convenzione percorso file: `{tipo}/{id}/{filename}` (es. `audio/123/song.mp3`, `profile/456/avatar.jpg`, `apk/spotifai-latest.apk`).
  - Cancellare sempre il vecchio file su S3 prima di sostituirlo o eliminarlo.

### 2. Frontend & Riproduzione Audio
- **Stato Audio Globale**: Gestito unicamente da `AudioContext.tsx`. Non creare player locali nelle schermate; usare `useAudio()`.
- **Player Fisso**: `GlobalMiniPlayer.tsx` è montato a livello globale in `App.tsx` ed è visibile sopra le tab di navigazione quando un brano è in riproduzione.
- **Chiamate REST**: Centralizzate in `frontend/services/api.ts`.
- **Tema & UI**: Palette coerente con tema scuro Spotify in `frontend/services/theme.ts`.

---

## 🗄️ Specifiche Schema Database

- **Utente**: `id`, `nome`, `cognome`, `email` (unique), `password` (BCrypt), `urlImmagineProfilo` (nullable, S3).
- **Artista**: `id`, `nome`, `urlImmagine` (nullable, S3). Many-to-Many con Album e Canzone.
- **Canzone**: `id`, `urlFileAudio` (required, S3), `anno` (nullable), `urlImmagine` (nullable, S3), `nome`. Many-to-Many con Artista, Many-to-One con Album.
- **Album**: `id`, `nome` (required), `anno` (nullable), `urlImmagine` (nullable, S3). Many-to-Many con Artista, One-to-Many con Canzone.
- **Playlist**: `id`, `nome`, associazione `playlist_canzone`.
- **AppVersion**: `id`, `version`, `apkUrl`, `releaseNotes`, `mandatory`, `createdAt`.

---

## 🚀 Aggiornamenti APK (In-App Updater)

L'app include un sistema di self-update all'avvio:
- Il backend espone gli endpoint `/api/v1/app/version`, `/api/v1/app/download` e `/api/v1/app/upload-apk`.
- `App.tsx` confronta `CURRENT_VERSION` con la versione restituita da `/api/v1/app/version`. Se inferiore, mostra `UpdateModal.tsx` per scaricare e installare il nuovo file APK.

### Procedura per rilasciare un aggiornamento APK:
1. In `frontend/app.json`: aggiornare `"version"` (es. da `"1.0.0"` a `"1.0.1"`).
2. In `frontend/App.tsx`: aggiornare la costante `CURRENT_VERSION = '1.0.1'`.
3. Compilare il nuovo file sempre su cloud EAS (NON in locale):
   ```bash
   cd frontend
   eas build --platform android --profile preview
   ```
4. Registrare/caricare il nuovo file APK:
   - Registrazione URL: `curl -X POST "https://music.davideluisi.com/api/v1/app/register-version" -d "version=1.0.1" -d "apkUrl=..." -d "releaseNotes=..."`
   - Oppure upload binario su S3: `curl -X POST "https://music.davideluisi.com/api/v1/app/upload-apk" -F "file=@app.apk" -F "version=1.0.1"`

---

## 🛠️ Comandi di Base Frequenti

| Task | Cartella | Comando |
| :--- | :--- | :--- |
| Avvia DB PostgreSQL | Root (`/`) | `docker-compose up -d` |
| Avvia Backend | `backend/` | `mvn spring-boot:run` |
| Compila Backend (no test) | `backend/` | `mvn clean package -DskipTests` |
| Test Backend | `backend/` | `mvn test` |
| Avvia Expo Frontend | `frontend/` | `npx expo start` |
| Compilazione APK (EAS Cloud) | `frontend/` | `eas build --platform android --profile preview` |
| Verifica Tipi TypeScript | `frontend/` | `npx tsc --noEmit` |
| Diagnosi Expo | `frontend/` | `npx expo-doctor` |

---

## 📝 Linee Guida per Modifiche al Codice (Checklist Agente)
1. Leggere questo file per conoscere convenzioni e percorsi senza scansionare cartelle.
2. Per modifiche al DB: creare sempre un nuovo file changeset Liquibase incrementale (mai modificare file preesistenti).
3. Non esporre Entity JPA nei controller: usare sempre DTO e `ApiResponse<T>`.
4. Nel frontend, non istanziare player audio duplicati: appoggiarsi sempre a `AudioContext`.
5. Non committare segreti, credenziali o file `.env`.
