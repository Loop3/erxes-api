FROM node:12.16.3-slim

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y \
    gnupg2 git nano && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /engages-email-sender

COPY --chown=node:node . /engages-email-sender

RUN chown -R node:node /engages-email-sender

USER node

RUN yarn

RUN yarn build

EXPOSE 3900

ENTRYPOINT [ "node", "--max_old_space_size=8192", "dist" ]
