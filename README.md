# 🎵 Spotifai (MusicApp)

Una piattaforma di streaming musicale full-stack e mobile-first ispirata a Spotify, con backend in **Spring Boot 3**, persistenza su **PostgreSQL** e **AWS S3**, e client mobile in **React Native** con **Expo**.

---

## 📑 Indice

1. [Funzionamento e Architettura](#-funzionamento-e-architettura)
2. [Funzionalità Principali](#-funzionalità-principali)
3. [Stack Tecnologico](#-stack-tecnologico)
4. [Prerequisiti](#-prerequisiti)
5. [Installazione e Avvio Locale](#-installazione-e-avvio-locale)
   - [1. Database PostgreSQL](#1-database-postgresql)
   - [2. Configurazione e Avvio Backend](#2-configurazione-e-avvio-backend)
   - [3. Configurazione e Avvio Frontend](#3-configurazione-e-avvio-frontend)
6. [Variabili d'Ambiente](#-variabili-dambiente)
7. [In-App Updater e Rilascio APK](#-in-app-updater-e-rilascio-apk)
8. [Script Rapidi (Windows)](#-script-rapidi-windows)
9. [Struttura del Progetto](#-struttura-del-progetto)

---

## 🧠 Funzionamento e Architettura

L'applicazione segue un'architettura client-server modulare:

- **Client Mobile (Expo / React Native)**:
  - Interfaccia utente scura responsive in stile Spotify.
  - Riproduzione audio gestita tramite uno stato globale unico (`AudioContext`), che supporta code, play/pause, seek e un mini-player persistente visibile durante la navigazione.
  - Comunicazione via REST API con risposte standardizzate in formato `ApiResponse<T>`.
  - Sistema di auto-aggiornamento all'avvio con download e installazione in-app di nuovi APK.

- **Server Backend (Spring Boot 3)**:
  - Espone API REST con base path `/api/v1` per autenticazione, gestione brani, album, artisti, playlist e versioni dell'app.
  - Autenticazione e sicurezza gestite tramite Spring Security con hashing password in BCrypt.
  - Modello DTO rigoroso: nessuna entity JPA viene esposta direttamente al client.
  - Database evolutivo gestito tramite migrazioni Liquibase.

- **Storage e Media (AWS S3)**:
  - File audio, copertine di album/brani, avatar profilo e file binari APK sono archiviati su AWS S3 con percorsi strutturati `{tipo}/{id}/{filename}`.
  - Servizio automatico di pulizia e sostituzione dei vecchi file per evitare file orfani su S3.

---

## ✨ Funzionalità Principali

- 🔐 **Autenticazione & Utente**: Registrazione, login, gestione profilo, cambio password e upload immagine avatar.
- 🎶 **Streaming & Player Audio**: Riproduzione tracce audio con player a schermo intero e mini-player ancorato sopra la barra di navigazione.
- 📁 **Catalogo Musicale**:
  - Canzoni con ricerca, filtraggio e metadati (titolo, anno, copertina, associazione artista/album).
  - Album con copertine e modale con lista tracce completa.
  - Artisti con biografia/dettagli e brani correlati.
- 📑 **Playlist Personalizzate**: Creazione, modifica, eliminazione e aggiunta rapida di brani alle proprie playlist.
- 📤 **Upload Brani**: Caricamento di file audio e metadati verso lo storage S3.
- 🔄 **Self-Updater APK**: Notifica di nuove versioni disponibili e download/installazione automatica dell'APK da S3 direttamente dall'app.

---

## 🛠️ Stack Tecnologico

### Backend
- **Linguaggio**: Java 17+ (o Java 21)
- **Framework**: Spring Boot 3.x
- **Sicurezza**: Spring Security, BCrypt
- **Accesso ai Dati**: Spring Data JPA / Hibernate
- **Database**: PostgreSQL 15+
- **Database Migrations**: Liquibase
- **Cloud Storage**: AWS S3 (via Spring Cloud AWS / AWS SDK)
- **Build Tool**: Apache Maven

### Frontend
- **Framework**: React Native con Expo SDK
- **Linguaggio**: TypeScript
- **Navigazione**: React Navigation (Bottom Tabs, Stack)
- **Audio Engine**: `react-native-track-player` / Expo Audio
- **HTTP Client**: Axios (centralizzato con interceptor)
- **Stile & Design**: StyleSheet React Native con palette scura Spotify

---

## 📋 Prerequisiti

Assicurarsi di avere installato:
- [Git](https://git-scm.com/)
- [JDK 17](https://adoptium.net/) o superiore (impostare `JAVA_HOME`)
- [Apache Maven](https://maven.apache.org/) (versione 3.8+)
- [Node.js](https://nodejs.org/) (v20+ o v24 LTS consigliata)
- [Docker](https://www.docker.com/) e Docker Compose (per il DB locale)
- Dispositivo Android fisico (con debug USB) o emulatore Android / Expo Go per testare l'app.

---

## 🚀 Installazione e Avvio Locale

### 1. Database PostgreSQL

Per avviare rapidamente un'istanza locale di PostgreSQL con Docker Compose:

```bash
# Dalla radice del progetto
docker-compose up -d
```

Il database sarà accessibile su `localhost:5433` (o `5432` a seconda del mapping configurato) con le credenziali predefinite:
- **Database**: `musicapp`
- **Username**: `postgres`
- **Password**: `postgres`

---

### 2. Configurazione e Avvio Backend

1. Entrare nella cartella `backend`:
   ```bash
   cd backend
   ```

2. Configurare le variabili d'ambiente necessarie (oppure creare un file `.env` in `backend/`):
   ```properties
   SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/musicapp
   SPRING_DATASOURCE_USERNAME=postgres
   SPRING_DATASOURCE_PASSWORD=postgres
   AWS_ACCESS_KEY_ID=tuo_access_key
   AWS_SECRET_ACCESS_KEY=tuo_secret_key
   ```

3. Compilare ed eseguire l'applicazione Spring Boot:
   ```bash
   mvn clean spring-boot:run
   ```

All'avvio, Liquibase applicherà automaticamente tutti i changeset del database e il server sarà in ascolto su:
```text
http://localhost:8080/api/v1
```

---

### 3. Configurazione e Avvio Frontend

1. Entrare nella cartella `frontend`:
   ```bash
   cd frontend
   ```

2. Installare le dipendenze:
   ```bash
   npm install
   ```

3. Verificare l'URL del backend in `services/api.ts`:
   - Se si testa su un emulatore Android locale, usare `http://10.0.2.2:8080/api/v1`.
   - Se si testa su dispositivo fisico, usare l'IP locale del PC (es. `http://192.168.1.X:8080/api/v1`) oppure l'host di produzione.

4. Avviare il server Expo:
   ```bash
   npx expo start
   ```

5. Premere `a` per aprire l'applicazione sull'emulatore Android, oppure inquadrare il QR code con l'app Expo Go / Development Build sul dispositivo fisico.

---

## ⚙️ Variabili d'Ambiente

### Backend (`application.yml` o variabili di sistema / `.env`)

| Variabile | Descrizione | Default Locale |
| :--- | :--- | :--- |
| `SPRING_DATASOURCE_URL` | Stringa di connessione JDBC Postgres | `jdbc:postgresql://127.0.0.1:5434/musicapp` |
| `SPRING_DATASOURCE_USERNAME` | Utente del database | `postgres` |
| `SPRING_DATASOURCE_PASSWORD` | Password del database | `postgres` |
| `AWS_ACCESS_KEY_ID` | Access Key AWS per bucket S3 | - |
| `AWS_SECRET_ACCESS_KEY` | Secret Key AWS per bucket S3 | - |

---

## 📦 In-App Updater e Rilascio APK

L'app implementa un sistema autonomo di auto-aggiornamento senza dipendere da Google Play Store:

1. **Aggiornamento versione nel client**:
   - Modificare `version` in `frontend/app.json` (es. `1.0.2`).
   - Modificare la costante `CURRENT_VERSION = '1.0.2'` in `frontend/App.tsx`.
2. **Generazione build APK**:
   ```bash
   cd frontend
   eas build --platform android --profile preview
   ```
3. **Pubblicazione**:
   Caricare o registrare il nuovo APK tramite endpoint del backend:
   ```bash
   curl -X POST "https://music.tuodominio.com/api/v1/app/upload-apk" \
     -F "file=@app-release.apk" \
     -F "version=1.0.2" \
     -F "releaseNotes=Correzioni bug e miglioramenti player audio"
   ```
4. All'avvio dell'app, se viene rilevata una versione superiore, comparirà il modale `UpdateModal` per scaricare e installare l'APK con un click.

---

## ⚡ Script Rapidi (Windows)

Nella root del progetto sono inclusi due comodi script batch per Windows:

- **`run_be.bat`**: Imposta il path di Java e Maven, apre il tunnel SSH verso il database remoto/VPS se necessario e avvia il backend Spring Boot.
- **`run_fe.bat`**: Configura l'ambiente Node e avvia il server di sviluppo Expo.

---

## 📂 Struttura del Progetto

```text
musicapp/
├── README.md                                # Questo file
├── AGENTS.md                                # Linee guida e documentazione interna
├── docker-compose.yml                       # Container PostgreSQL per sviluppo locale
├── run_be.bat                               # Script avvio rapido backend
├── run_fe.bat                               # Script avvio rapido frontend
│
├── backend/                                 # Modulo Backend Spring Boot
│   ├── pom.xml                              # Dipendenze Maven
│   ├── Dockerfile                           # Containerizzazione backend
│   └── src/main/
│       ├── resources/
│       │   ├── application.yml              # Configurazione Spring, JPA, AWS S3
│       │   └── db/                          # Migrazioni Liquibase (tabelle e modifiche schema)
│       └── java/com/musicapp/
│           ├── config/                      # Configurazioni AWS S3 e Spring Security
│           ├── controller/                  # Endpoints REST (Auth, Canzoni, Album, Playlist, ecc.)
│           ├── dto/                         # Data Transfer Objects e wrapper ApiResponse
│           ├── entity/                      # Entità JPA (Utente, Canzone, Artista, Album, ...)
│           ├── repository/                  # Repositories Spring Data JPA
│           └── service/                     # Servizi business logic e storage S3
│
└── frontend/                                # Modulo Mobile Expo / React Native
    ├── App.tsx                              # Entry point, Tab Navigator e providers
    ├── app.json                             # Configurazione Expo e manifest Android
    ├── package.json                         # Dipendenze npm
    ├── components/                          # Componenti UI (GlobalMiniPlayer, Modali)
    ├── screens/                             # Schermate (Songs, Albums, Artists, Playlists, Profile)
    └── services/                            # AudioContext, AuthContext, client API Axios e tema
```

---

## 📄 Licenza

Progetto ad uso personale/didattico. Tutti i diritti riservati.

