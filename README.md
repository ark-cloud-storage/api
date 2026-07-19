# Backend

## Links
- [CurseForge](https://www.curseforge.com/ark-survival-ascended/mods/cloud-storage)
- [Discord](https://discord.com/invite/K4a4DvZak5)

## Getting started

The easiest way to get started is to use docker compose.
An example `docker-compose.yml` is provided in the root of the project.
- Copy `.env.example` to `.env` and set at least `MYSQL_ROOT_PASSWORD`.
- Configure the clusters to seed via `REGISTER_CLUSTERS` (comma-separated `id:secret` pairs).
- Start everything with `docker-compose up -d`. Startup order is handled automatically:
  the database starts, the one-shot `migrate` container applies schema migrations and
  hashes any existing plaintext secrets, and only then does the `api` start.
- Edit your GameUserSettings.ini file to point to the api:
  ```
    [CloudStorage]
    ID=your-cluster-id
    Secret="your-cluster-secret"
    URL="ws://127.0.0.1:3000"
  ```
  *If your ARK server is on another host, expose port 3000 (change `"127.0.0.1:3000:3000"` to `"3000:3000"` for the `api` `ports` section and re-deploy with `docker compose up -d`).*
