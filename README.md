# Backend

## Links
- [CurseForge](https://www.curseforge.com/ark-survival-ascended/mods/cloud-storage)
- [Discord](https://discord.com/invite/K4a4DvZak5)

## Getting started

The easiest way to get started is to use docker compose.
An example of the `docker-compose.yml` file is provided in the root of the project.
- Edit the compose file and change the environment passwords to a secure value.
- Edit the compose file to configure the clusters and secrets to create.
- Start the database and the api with `docker-compose up -d db`.
- Run the migrations with `docker-compose run api npx prisma migrate deploy`.
- Start the api with `docker-compose up -d api`.
- Edit your GameUserSettings.ini file to point to the api:  
  ```
    [CloudStorage]
    ID=your-cluster-id
    Secret="yout-cluster-secret"
    URL="ws://127.0.0.1:3000"
  ```
  *If your ARK server is on antoher host make sure to edit the docker-compose.yml file to expose port 3000 (change `"127.0.0.1:3000:3000"` to `"3000:3000"` for the `api` `ports` section and re-deploy it using `docker compose up -d`)*
