FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm -F shared build
# Debug: verify shared dist and symlink
RUN ls -la packages/shared/dist/ && ls -la node_modules/@majiang/shared/ && cat node_modules/@majiang/shared/package.json | head -15
RUN pnpm -F server build

FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/package.json ./
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/shared/dist/ packages/shared/dist/
COPY --from=builder /app/apps/server/package.json apps/server/
COPY --from=builder /app/apps/server/dist/ apps/server/dist/
RUN pnpm install --frozen-lockfile --prod
EXPOSE 7702
CMD ["node", "apps/server/dist/index.js"]
