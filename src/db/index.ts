import { Kysely } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";
import type { DB } from "./generated/schema";
import { env } from "@app/env";

const pg = postgres(env.DATABASE_URL);

export const db = new Kysely<DB>({
  dialect: new PostgresJSDialect({ postgres: pg }),
});
