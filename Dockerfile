FROM node:10-alpine

MAINTAINER dev@adex.network

ENV PORT=
ENV ADAPTER=
ENV IDENTITY=
ENV DB_MONGO_URL=
ENV DB_MONGO_NAME=
ENV KEYSTORE_FILE=
ENV KEYSTORE_PASSWORD=

RUN echo 'http://dl-3.alpinelinux.org/alpine/edge/testing' >> /etc/apk/repositories && \
    apk upgrade --update && \ 
    apk add mongodb

RUN apk add --update alpine-sdk
RUN apk add --update python

WORKDIR /app 

EXPOSE ${PORT}

ADD . .

RUN npm install --production

CMD PORT=${PORT} node bin/sentry.js --adapter=${ADAPTER} --keystoreFile=${KEYSTORE_FILE} && \
	node bin/validatorWorker.js --adapter=${ADAPTER} --keystoreFile=${KEYSTORE_FILE} --keystorePwd=${KEYSTORE_PASSWORD} --sentryUrl=http://127.0.0.1:${PORT}
    
