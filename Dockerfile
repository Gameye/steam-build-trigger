FROM node:10

WORKDIR /usr/src/app

COPY package.json package.json
COPY package-lock.json package-lock.json
COPY node_modules/ node_modules/
COPY src/ src/
COPY node/ node/
COPY config/ config/

ENTRYPOINT [ "node", "node/program" ]
