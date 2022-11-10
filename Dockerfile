FROM node:16.14.2
WORKDIR /contracts
ADD . ./
RUN yarn install --frozen-lockfile --silent && yarn cache clean
RUN yarn build
RUN yarn info