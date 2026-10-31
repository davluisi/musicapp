# Frontend - Expo & React Native Architecture & Context

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

---

## 🧭 Struttura Directory & Mappa Componenti (`frontend/`)

```text
frontend/
├── App.tsx                     # Setup Tab Navigator, Auth flow, UpdateModal trigger, ThemeProvider
├── app.json                    # Configurazione Expo (versione app, bundleIdentifier, icone, splash)
├── eas.json                    # Profili build EAS (development, preview, production)
├── package.json                # Dipendenze React Native, Expo, Axios, Track Player / AV
├── components/
│   ├── AlbumDetailModal.tsx    # Modale con dettagli album e lista tracce
│   ├── GlobalMiniPlayer.tsx    # Mini player fisso in basso con controlli traccia e apertura full screen
│   └── UpdateModal.tsx         # Popup per notifica e download/installazione automatica nuovo APK
├── screens/
│   ├── SongsScreen.tsx         # Lista brani, riproduzione, ricerca, aggiunta a playlist, upload brano
│   ├── AlbumsScreen.tsx        # Griglia/lista album, apertura AlbumDetailModal
│   ├── ArtistsScreen.tsx       # Lista artisti e brani associati
│   ├── PlaylistsScreen.tsx     # Creazione, visualizzazione e gestione playlist personali
│   └── ProfileScreen.tsx       # Gestione profilo utente, avatar, cambio credenziali e logout
└── services/
    ├── api.ts                  # Axios client centralizzato, endpoint REST verso backend, gestione token
    ├── AudioContext.tsx        # React Context per stato audio globale: player, coda, play/pause/seek
    ├── AuthContext.tsx         # React Context per login, registrazione, sessione utente e persistenza
    ├── DialogContext.tsx       # Helper per alert/conferme personalizzati UI
    ├── navigation.ts           # Riferimenti e helper di navigazione imperativa
    └── theme.ts                # Palette colori scura (stile Spotify: #121212, #1DB954 verde Spotify, ecc.)
```

---

## ⚡ Regole e Best Practice Expo

### Expo has changed — do not trust your training data
Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:
1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch `https://docs.expo.dev/llms.txt` — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

### Comandi Standard Frontend
Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).
```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```
*Run lint and typecheck before declaring any task done.*

### Regole Native & Moduli
- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries. Docs: `https://docs.expo.dev/versions/latest/index.md`

### Building with EAS
Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required.
Docs: `https://docs.expo.dev/eas/index.md`

---

## 🎵 Flusso Funzionale & Convenzioni Interne

1. **Gestione Audio (`AudioContext.tsx`)**:
   - Tutta la riproduzione musicale (play, pause, next, prev, seek, coda brani) è incapsulata in `AudioContext`.
   - `GlobalMiniPlayer.tsx` si aggancia a questo contesto per mostrare il brano in corso su qualsiasi schermata sopra la tab bar.
   - Non creare mai istanze audio o player locali nelle schermate; usare `useAudio()`.

2. **Chiamate API (`api.ts`)**:
   - Tutte le chiamate HTTP passano per le funzioni esportate da `api.ts`.
   - Gestisce automaticamente gli header di autenticazione e l'interceptor per gli errori.

3. **Stile & Design**:
   - Design dark theme consistente ispirato a Spotify (colori e costanti definiti in `services/theme.ts`).
   - Componenti modulari con StyleSheet tipizzati.
