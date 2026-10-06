# MusicApp - Project Rules and Conventions

## Project Overview
Music streaming mobile application for audio content management and playback.

## Tech Stack

### Backend
- **Framework**: Spring Boot (Java)
- **Database**: PostgreSQL (via Docker)
- **Database Migrations**: Liquibase
- **Storage**: AWS S3 (for audio files and user profile images)
- **Build Tool**: Maven

### Frontend
- **Framework**: Expo (React Native wrapper for easier development)
- **Platform**: iOS and Android (and web support)
- **Language**: TypeScript

### Infrastructure
- **Containerization**: Docker Compose for PostgreSQL
- **Cloud Storage**: AWS S3 bucket `musicapp-017719539384-eu-south-1-an` (region: eu-south-1)

## Project Structure

```
musicapp/
├── backend/                 # Spring Boot backend
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── com/musicapp/
│   │   │   │       ├── entity/
│   │   │   │       ├── repository/
│   │   │   │       ├── service/
│   │   │   │       ├── controller/
│   │   │   │       ├── config/
│   │   │   │       └── dto/
│   │   │   └── resources/
│   │   │       ├── db/              # Liquibase migrations
│   │   │       └── application.yml
│   │   └── test/
│   └── pom.xml
├── frontend/                # Expo React Native frontend
│   ├── screens/             # Screen components
│   │   ├── ProfileScreen.tsx
│   │   ├── ArtistsScreen.tsx
│   │   ├── AlbumsScreen.tsx
│   │   └── SongsScreen.tsx
│   ├── services/            # API service layer
│   │   └── api.ts
│   ├── App.tsx              # Main app component with navigation
│   ├── package.json
│   └── app.json
├── docker-compose.yml       # PostgreSQL container
└── AGENTS.md                # This file
```

## Backend Conventions

### Entity Naming
- Use Java class names in PascalCase (e.g., `Utente`, `Canzone`)
- Table names in snake_case (e.g., `utente`, `canzone`)
- All entities must have an `id` field (Long, auto-generated)

### Repository Layer
- Use Spring Data JPA repositories
- Extend `JpaRepository<Entity, Long>`
- Repository interfaces in `repository/` package
- Annotation `@Repository` on repository interfaces

### DTO Layer
- Use DTOs for request/response, never expose entities directly
- DTOs in `dto/` package
- DTO fields match entity fields but without JPA annotations
- All DTOs have Lombok annotations (@Data, @NoArgsConstructor, @AllArgsConstructor)

### Service Layer
- Service classes in `service/` package
- Use `@Service` annotation
- Use `@RequiredArgsConstructor` for dependency injection
- Convert between entities and DTOs in service methods
- Business logic belongs in services

### Controller Layer
- Controllers in `controller/` package
- Use `@RestController` annotation
- Base path: `/api/v1`
- RESTful endpoints: GET, POST, PUT, DELETE
- Use `ApiResponse<T>` wrapper for all responses with `data`, `message`, `status` fields
- Use `@RequiredArgsConstructor` for dependency injection
- Handle exceptions with appropriate HTTP status codes

### Database Migrations (Liquibase)
- All database changes MUST go through Liquibase migrations
- Migration files in `src/main/resources/db/`
- Use incremental IDs: `db.changelog-001-create-utente.xml`, `db.changelog-002-create-artista.xml`
- Always create a NEW changelog file for each entity or major change
- Never modify existing migration files once committed
- Include rollback scripts for destructive changes
- Do NOT use `runOnChange="true"` for table creation changesets (only for data modifications)
- For new columns: create a new changeset (e.g., `db.changelog-006-add-column.xml`) with `addColumn` instead of recreating tables
- For structural changes: always create new incremental changesets rather than modifying existing ones
- If a migration fails, delete the failed changeset from `databasechangelog` table and restart

### API Conventions
- RESTful endpoints
- Base path: `/api/v1`
- Use DTOs for request/response, never expose entities directly
- Response format: standard JSON with `data`, `message`, `status` fields
- Endpoints:
  - `/artisti` - CRUD operations for artists
  - `/album` - CRUD operations for albums
  - `/canzoni` - CRUD operations for songs
- Use `ApiResponse<T>` wrapper for consistent responses

### S3 Storage
- Audio files stored in S3 bucket `musicapp-017719539384-eu-south-1-an`
- Profile images stored in S3 bucket
- Use Spring Cloud AWS for S3 integration
- File naming convention: `{type}/{id}/{filename}` (e.g., `audio/123/song.mp3`, `profile/456/avatar.jpg`)
- Region: eu-south-1

## Frontend Conventions

### Component Structure
- Functional components with hooks
- TypeScript for type safety
- Component files in PascalCase (e.g., `UserProfile.tsx`, `Player.tsx`)
- Main app file is `App.tsx`
- Expo uses file-based routing in the `app/` directory

### API Calls
- Use a centralized API service module
- All API calls through a single service file
- Proper error handling and loading states

### Mobile-Specific
- Use Expo for cross-platform development
- Follow React Native best practices
- Platform-specific code when necessary (iOS vs Android)
- Test on both platforms using Expo Go app or emulators

## Build and Run Commands

### Backend
```bash
# Start PostgreSQL (from project root)
docker-compose up -d

# Run application
cd backend
mvn spring-boot:run

# Build
mvn clean package

# Run tests
mvn test
```

### Frontend
```bash
cd frontend
# Install dependencies
npm install

# Start Expo development server
npm start

# Run on iOS (requires macOS or Expo Go app)
npm run ios

# Run on Android (requires Android emulator or Expo Go app)
npm run android

# Run on web
npm run web
```

## Environment Variables

The `.env` file in backend root (NOT committed to git) should contain:
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

Note: Database credentials are in application.yml for development. For production, move them to environment variables.

AWS Configuration:
- Bucket: musicapp-017719539384-eu-south-1-an
- Region: eu-south-1

## Database Schema Rules

### Utente Entity
- Fields: id, nome, cognome, email, password, urlImmagineProfilo
- Email must be unique
- Password should be hashed (BCrypt)
- urlImmagineProfilo is nullable

### Artista Entity
- Fields: id, nome, cognome, urlImmagine
- urlImmagine is nullable (stored in S3)
- Many-to-many relationship with Album
- Many-to-many relationship with Canzone

### Canzone Entity
- Fields: id, urlFileAudio, anno, urlImmagine
- urlFileAudio is required (stored in S3)
- anno is nullable
- urlImmagine is nullable (stored in S3)
- Many-to-many relationship with Artista
- Many-to-one relationship with Album

### Album Entity
- Fields: id, nome, anno, urlImmagine
- nome is required
- anno is nullable
- urlImmagine is nullable (stored in S3)
- Many-to-many relationship with Artista
- One-to-many relationship with Canzone

### General Rules
- Use `VARCHAR` for text fields with appropriate length
- Use `TIMESTAMP` for dates
- Use `BOOLEAN` for flags
- Add `created_at` and `updated_at` timestamps to all tables
- Add indexes on foreign keys and frequently queried fields

## Testing

### Backend
- Unit tests for services
- Integration tests for repositories
- API tests for controllers

### Frontend
- Component tests with React Native Testing Library
- E2E tests with Detox (if needed)

## Before Making Changes

1. Read this AGENTS.md file to understand conventions
2. Check existing patterns in the codebase
3. Create Liquibase migration for any database changes
4. Follow the established folder structure
5. Use existing dependencies before adding new ones
6. Test changes locally before committing

## Git Workflow

- Feature branches: `feature/description`
- Commit messages: Conventional Commits format
- Never commit secrets or API keys
- Run tests before committing
