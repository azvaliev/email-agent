import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import type { DB } from "./generated/schema";
import { dbPool } from "@app/lib/db-pool";

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({ pool: dbPool }),
  plugins: [new CamelCasePlugin()],
});
