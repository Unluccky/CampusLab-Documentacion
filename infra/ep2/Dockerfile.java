FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S campuslab && adduser -S -G campuslab campuslab
WORKDIR /app
COPY --chown=campuslab:campuslab --chmod=0444 app.jar app.jar
USER campuslab
ENTRYPOINT ["java","-jar","app.jar"]
