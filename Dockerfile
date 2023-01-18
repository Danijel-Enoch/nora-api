FROM redis:6.2.1-alpine
USER ${USER}
RUN apk -U upgrade \
    && apk --no-cache --update add build-base 
EXPOSE 6379