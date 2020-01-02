# Inform Docker to make use of the Alpine variant of Node 12.
FROM node:12-alpine AS builder

# Change the work directory within our image.
WORKDIR /usr/src/steam-build-trigger

# Copy over all necessary files into our image.
COPY src src
COPY .npmrc package.json package-lock.json tsconfig.json tsconfig.module.json ./

# Consumes the NPM_TOKEN argument from the command-line.
ARG NPM_TOKEN

# Consumes the NPM_VERSION argument from the command-line.
ARG NPM_VERSION

# Creates the '.npmrc' file with the 'NPM_TOKEN' argument passed from
# the command-line, which allows us to authenticate into NPM for our
# private Gameye repositories.
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" >> ~/.npmrc
RUN npm version "${NPM_VERSION}"
RUN npm install
RUN npm run compile

# Now that we're done building, let's start over with a clean image and
# copy over the binaries that we've produced during the building process.
FROM node:12-alpine

# Change the work directory within our image.
WORKDIR /usr/bin/steam-build-trigger

# Copies over the all necessary files from the builder image that are required
# to run the service.
COPY --from=builder /usr/src/steam-build-trigger/package.json /usr/bin/steam-build-trigger/package.json
COPY --from=builder /usr/src/steam-build-trigger/node /usr/bin/steam-build-trigger/node
COPY --from=builder /usr/src/steam-build-trigger/node_modules /usr/bin/steam-build-trigger/node_modules

COPY config /usr/bin/steam-build-trigger/config

# Define our entry point that the container is to call when ran.
ENTRYPOINT [ "node", "--unhandled-rejections", "strict", "node/program" ]