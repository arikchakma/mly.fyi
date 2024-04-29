ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-slim AS base
RUN apt-get update && apt-get upgrade -y && apt-get install -y ca-certificates
RUN apt-get install -y sqlite3 libsqlite3-dev
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM base AS runtime

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Move the drizzle directory to the runtime image
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src/templates ./dist/server/src/templates

# Move the litestream binary to the runtime image from the litestream image
# You can use a specific version of litestream by changing the tag
# COPY --from=litestream/litestream:0.3.13 /usr/local/bin/litestream /usr/local/bin/litestream
COPY --from=litestream/litestream:latest /usr/local/bin/litestream /usr/local/bin/litestream

# Move the run script and litestream config to the runtime image
COPY --from=build /app/scripts/run.sh run.sh
COPY --from=build /app/litestream.yml /etc/litestream.yml
RUN chmod +x run.sh

# Create the data directory for the database
RUN mkdir -p /data

ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production
EXPOSE 4321
CMD ["sh", "run.sh"]