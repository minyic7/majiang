# majiang

Fresh rewrite for a Unity + C# Mahjong stack.

## Current scope

- `server-dotnet`: ASP.NET Core backend skeleton
- `docker-compose.yml`: keeps the Mac mini deployment entry at the repo root

## Local run

Build and run with Docker:

```bash
docker compose up --build
```

The server listens on port `7702`.

Health check:

```bash
curl http://localhost:7702/api/health
```

## Notes

- The legacy TypeScript codebase and GitHub Actions workflows have been removed.
- The Mac mini deployment entry is intentionally preserved at the root via `docker-compose.yml`.

