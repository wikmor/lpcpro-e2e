ARG JAVA_VERSION=21
FROM openjdk:${JAVA_VERSION}

WORKDIR /server

# Optional: if you want to set things up once
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 25565

CMD ["/start.sh"]
