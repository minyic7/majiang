FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm -F shared build
RUN pnpm -F web build

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
