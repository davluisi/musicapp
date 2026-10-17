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

# Creazione utente non privilegiato per sicurezza
RUN addgroup -S musicapp && adduser -S musicapp -G musicapp
USER musicapp

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
