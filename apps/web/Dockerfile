FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/web/ apps/web/
RUN pnpm install --frozen-lockfile
RUN pnpm -F shared build && pnpm -F web build

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist/ /usr/share/nginx/html/majiang/
RUN echo 'server { \
    listen 80; \
    location /majiang/ { \
        root /usr/share/nginx/html; \
        try_files $uri $uri/ /majiang/index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
