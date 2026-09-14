# Upgrading

Migration notes land here per release. Pre-alpha: expect breaking schema changes; `prisma migrate deploy` runs pending migrations in order.

## Unreleased (pre-alpha)

- Initial schema (M1). No upgrade path guaranteed before the first tagged release.
- If a migration fails on an existing volume: `docker compose down -v` resets the local database (destroys data), then `docker compose up` re-migrates and re-seeds.
