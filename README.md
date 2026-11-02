# 🎵 MusicApp

Una piattaforma di streaming musicale full-stack e mobile-first ispirata a Spotify, con backend in **Spring Boot 3**, persistenza su **PostgreSQL** e **AWS S3**, e client mobile in **React Native** con **Expo**.

---

## 📑 Indice

1. [Panoramica e Funzionamento](#-panoramica-e-funzionamento)
2. [Funzionalità Principali](#-funzionalità-principali)
3. [Stack Tecnologico](#-stack-tecnologico)
4. [Architettura del Sistema](#-architettura-del-sistema)
5. [In-App Self-Updater](#-in-app-self-updater)
6. [Struttura del Repository](#-struttura-del-repository)

---

## 🧠 Panoramica e Funzionamento

MusicApp è un'applicazione mobile completa per la consultazione e la riproduzione di musica in streaming, progettata per offrire un'esperienza reattiva e fluida:

- **Client Mobile (Expo & React Native)**:
  - Interfaccia scura coerente con lo stile di Spotify (palette `#121212`, accenti verdi `#1DB954`).
  - Stato di riproduzione audio centralizzato (`AudioContext`) che garantisce la persistenza del playback durante tutta la navigazione nell'app.
  - Mini-player fisso sopra la navigation bar con controlli rapidi (play/pause/traccia successiva) ed espansione a player a schermo intero.
  - Comunicazione con il backend via client REST centralizzato (`Axios`) con payload incapsulati in un wrapper unificato `ApiResponse<T>`.

- **Backend (Spring Boot 3)**:
  - Architettura a layer (Controller, Service, Repository, Entity, DTO).
  - Isolamento dei dati di dominio: nessuna entità JPA viene esposta all'esterno, tutte le chiamate transitano per DTO dedicati.
  - Autenticazione e gestione credenziali tramite Spring Security con hashing password in BCrypt.
  - Controllo versione del database gestito con migrazioni dichiarative Liquibase.

- **Archiviazione Cloud (AWS S3)**:
  - Streaming audio e asset grafici (avatar, copertine album e brani, pacchetti APK) salvati su bucket S3 protetti con percorsi strutturati `{tipo}/{id}/{filename}`.
  - Servizio di pulizia automatica per la rimozione dei vecchi file sostituiti.

---

## ✨ Funzionalità Principali

- 🔐 **Autenticazione & Profilo**: Registrazione utente, login, gestione profilo, cambio password e upload avatar personalizzato.
- 🎶 **Player Audio Continuo**: Riproduzione in background, barra di avanzamento, seek interattivo e mini-player sempre visibile.
- 📁 **Esplorazione Musicale**:
  - **Brani**: Lista tracce, ricerca live, filtri, riproduzione immediata e opzioni rapide.
  - **Album**: Griglia e dettagli album con elenco tracce e navigazione correlata.
  - **Artisti**: Schede artista con discografia e brani collegati.
  - **Playlist**: Creazione, modifica, eliminazione e aggiunta di brani a playlist personali.
- 📤 **Caricamento Brani**: Upload di file audio e metadati verso lo storage S3.
- 🔄 **Self-Updating APK**: Verifica automatica della versione dell'app all'avvio con download e installazione in-app dei nuovi aggiornamenti rilasciati.

---

## 🛠️ Stack Tecnologico

### Backend
- **Linguaggio**: Java 17+
- **Framework**: Spring Boot 3.x
- **Security**: Spring Security & BCrypt Password Encoder
- **Database & ORM**: PostgreSQL, Spring Data JPA / Hibernate
- **Database Migrations**: Liquibase
- **Cloud Storage**: AWS S3 (Spring Cloud AWS / AWS SDK)
- **Build Tool**: Apache Maven

### Frontend
- **Framework**: React Native con Expo SDK
- **Linguaggio**: TypeScript
- **Navigazione**: React Navigation (Bottom Tabs, Native Stack)
- **Audio Engine**: `react-native-track-player` / Expo Audio
- **Networking**: Axios (client HTTP centralizzato)
- **Design**: Stile personalizzato Spotify Dark Theme

---

## 🏗️ Architettura del Sistema

```text
┌────────────────────────────────────────┐
│        Mobile App (React Native/Expo)   │
│  - Bottom Tabs & Schermate             │
│  - Global MiniPlayer & Fullscreen View │
│  - AudioContext (Stato Globale)        │
└───────────────────┬────────────────────┘
                    │ REST API (/api/v1)
                    ▼
┌────────────────────────────────────────┐
│       Spring Boot 3 API Gateway        │
│  - SecurityFilter & BCrypt Auth        │
│  - Controller Layer & DTO Mapping      │
│  - Service Layer & Business Logic      │
└──────────────┬──────────────────┬──────┘
               │                  │
               ▼                  ▼
      ┌─────────────────┐ ┌───────────────┐
      │ PostgreSQL DB   │ │ AWS S3 Bucket │
      │ (Liquibase)     │ │ (Audio/Media) │
      └─────────────────┘ └───────────────┘
```

---

## 🔄 In-App Self-Updater

L'applicazione include un sistema di self-update per Android:
1. All'avvio, l'applicazione interroga l'endpoint `/api/v1/app/version`.
2. Se la versione restituita dal server è superiore a quella locale (`CURRENT_VERSION`), viene aperta automaticamente la modale di aggiornamento (`UpdateModal`).
3. L'utente può avviare il download del file APK direttamente da storage cloud ed eseguire l'aggiornamento dell'applicazione con un tap.

---

## 📂 Struttura del Repository

```text
musicapp/
├── README.md                                # Panoramica, stack e architettura del progetto
├── AGENTS.md                                # Guida e convenzioni di sviluppo per agenti/assistenti
│
├── backend/                                 # Modulo Backend Spring Boot
│   ├── pom.xml                              # Dipendenze Maven
│   ├── Dockerfile                           # Container per deploy backend
│   └── src/main/
│       ├── resources/
│       │   ├── application.yml              # Configurazione applicativa
│       │   └── db/                          # Migrazioni Liquibase
│       └── java/com/musicapp/
│           ├── config/                      # Configurazioni Security e Storage
│           ├── controller/                  # Endpoints REST (/api/v1/*)
│           ├── dto/                         # Data Transfer Objects
│           ├── entity/                      # Modelli di persistenza JPA
│           ├── repository/                  # Interfacce Spring Data JPA
│           └── service/                     # Servizi applicativi
│
└── frontend/                                # Modulo Mobile Expo / React Native
    ├── App.tsx                              # Entry point, navigatori e context provider
    ├── app.json                             # Configurazione del bundle Expo
    ├── components/                          # Componenti UI (MiniPlayer, modali)
    ├── screens/                             # Schermate principali (Songs, Albums, Artists, Playlists, Profile)
    └── services/                            # Gestione audio, autenticazione e client API
```

---

## 📄 Note & Licenza

Progetto a scopo personale e didattico. Tutti i diritti riservati.
