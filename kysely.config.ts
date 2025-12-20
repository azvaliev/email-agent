import { defineConfig } from "kysely-ctl";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";

export default defineConfig({
  dialect: new PostgresJSDialect({
    postgres: postgres(process.env.DATABASE_URL!),
  }),
  migrations: {
    migrationFolder: "migrations",
  },
});
