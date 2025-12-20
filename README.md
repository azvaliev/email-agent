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
To lint the code, run

```bash
yarn lint

```

To format the code, run

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

Start the Next.JS dev server by running

```bash
yarn dev
```
