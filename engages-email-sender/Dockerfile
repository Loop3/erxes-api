FROM node:12.18-slim

WORKDIR /erxes-engages
RUN chown -R node:node /erxes-engages
COPY --chown=node:node . /erxes-engages

USER node

RUN yarn

RUN yarn build

EXPOSE 3900

ENTRYPOINT [ "node", "--max_old_space_size=8192", "dist" ]
