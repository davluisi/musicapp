# Multi-stage Dockerfile per Spring Boot
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Cache delle dipendenze Maven
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Compilazione sorgenti
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Installa python3, ffmpeg, nodejs, yt-dlp e plugin PO Token provider
RUN apk update && \
    apk add --no-cache python3 py3-pip ffmpeg nodejs curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    python3 -m pip install --no-cache-dir --break-system-packages bgutil-ytdlp-pot-provider

# Creazione utente non privilegiato per sicurezza
RUN addgroup -S musicapp && adduser -S musicapp -G musicapp
USER musicapp

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
