# Inform Docker to make use of the Alpine variant of Node 12.
FROM node:12-alpine AS builder

# Consumes the NPM_TOKEN argument from the command-line.
ARG NPM_TOKEN

# Consumes the NPM_VERSION argument from the command-line.
ARG NPM_VERSION

# Change the work directory within our image.
WORKDIR /root

# Copy over all necessary files into our image.
COPY src /root/src
COPY package.json package-lock.json tsconfig.json tsconfig.module.json /root/

RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
RUN npm version "${NPM_VERSION}"
RUN npm install --unsafe-perm

# Now that we're done building, let's start over with a clean image and
# copy over the binaries that we've produced during the building process.
FROM node:12-alpine

# Add curl to our image so that healthchecks work
RUN apk --update --no-cache add curl

# Copies over the all necessary files from the builder image that are required
# to run the service.
COPY --from=builder /root/package.json /root/package.json
COPY --from=builder /root/node /root/node
COPY --from=builder /root/node_modules /root/node_modules

COPY config /usr/bin/steam-build-trigger/config

# Define our entry point that the container is to call when ran.
ENTRYPOINT [ "node", "--unhandled-rejections", "strict", "/root/node/program" ]
