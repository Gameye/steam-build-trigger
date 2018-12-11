FROM node:10

RUN mkdir -p /usr/app/
WORKDIR /usr/app/

COPY src/ src/
COPY node/ node/
COPY config/ config/

COPY .npmrc .npmrc
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm install --production --quiet
RUN rm .npmrc

CMD [ "node", "node/cli" ]
