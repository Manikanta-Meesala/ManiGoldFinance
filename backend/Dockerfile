# Build stage using Maven and JDK 21
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage using OpenJDK 21
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/finance-1.0.0.jar app.jar

# Expose port 5000
EXPOSE 5000

# Start Spring Boot application
ENTRYPOINT ["java", "-jar", "app.jar"]
