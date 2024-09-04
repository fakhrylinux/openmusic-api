# Open Music API

Backend of Open Music API with Node.js and Hapi.js

## How to use this application

1. Copy .env file.

```shell
cp .env.example .env
```

2. Generate `ACCESS_TOKEN_KEY` and `REFRESH_TOKEN_KEY` with Node REPL. Remember to using different key for
   `ACCESS_TOKEN_KEY` and `REFRESH_TOKEN_KEY`.

```shell
require('crypto').randomBytes(64).toString('hex');
```

3. Create database in PostgreSQL dan run migrate.

```shell
npm run migrate up
```

4. And run the app with `npm run start` or `npm run start:dev` for development.

## Documentation
You can read the API documentation at `BASE_URL/documentation`
