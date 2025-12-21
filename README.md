## Email Agent

This is an email agent designed to improve the usage of emails through

- on demand summarization
- flagging / notifying of important emails

## Design

There is a web app which will allow the user to

- generate/view the daily summarization
- see flagged important emails
- tune the agent as to what emails are important that it missed, etc

We're using postgres to store users along with email data, and AI tuning data.

The auth mechanism uses better-auth, one user can have multiple gmail accounts linked.

Use the "gmail.watch" mechanism to watch for new emails and trigger the agent.

## Getting Started

This project uses yarn as the package manager.
You can install the dependencies by running

```bash
yarn install
```

We have linting and formatting configured using eslint and prettier, respectively.
Tests are in Vitest

To check for lint, format and tests run

```bash
yarn check

```

To run formatting on the code, run

```bash
yarn format
```

### Migrations

Start the database by running

```bash
docker compose up -d
```

| Command                      | Description                |
| ---------------------------- | -------------------------- |
| `yarn db:migrate`            | Run all pending migrations |
| `yarn db:migrate:up`         | Run next migration         |
| `yarn db:migrate:down`       | Rollback all migrations    |
| `yarn db:migrate:new <name>` | Create new migration       |
| `yarn db:migrate:list`       | Show migration status      |
| `yarn db:codegen`            | Regenerate types from DB   |

### Running the App

Copy the `.env.example` file to `.env`

```bash
cp .env.example .env
```

### Environment setup

1. Edit `.env` and fill in the required variables:
   - `DATABASE_URL`: connection string for your Postgres instance. The same URL is reused by
     Kysely migrations and better-auth.
   - `BETTER_AUTH_SECRET`: at least 32 random characters. Generate one with `openssl rand -base64 32`.
   - `BETTER_AUTH_URL`: the public URL of your app (http://localhost:3000 during development).
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: OAuth credentials from Google Cloud Console.
     Create a Web OAuth client, add `http://localhost:3000/api/auth/callback/google` to
     Authorized redirect URIs, then paste the ID/secret here.
   - `GOOGLE_CLOUD_PROJECT`: Your GCP project ID
   - `GMAIL_PUBSUB_TOPIC`: Full Pub/Sub topic name (e.g., `projects/your-project/topics/gmail-notifications`)

2. Install dependencies and migrate the database:

```bash
yarn install
yarn db:migrate
```

3. **Set up Google Cloud Platform** for Gmail push notifications:

   See [docs/gcp-setup.md](docs/gcp-setup.md) for detailed instructions on configuring:
   - Pub/Sub topic for Gmail notifications
   - Push subscription with authentication
   - Required IAM permissions

4. Start the Next.js dev server:

```bash
yarn dev
```
