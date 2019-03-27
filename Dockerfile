FROM node:10

WORKDIR /usr/src/app

COPY package.json package.json
COPY package-lock.json package-lock.json
COPY src/ src/
COPY node/ node/

ENTRYPOINT [ "node", "node/program" ]
