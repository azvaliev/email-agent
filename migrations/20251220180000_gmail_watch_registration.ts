import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("gmail_watch_registration")
    .addColumn("id", "text", (col) => col.primaryKey().notNull())
    .addColumn("accountId", "text", (col) =>
      col.notNull().unique().references("account.id").onDelete("cascade"),
    )
    .addColumn("userId", "text", (col) =>
      col.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("emailAddress", "text", (col) => col.notNull())
    .addColumn("historyId", "text", (col) => col.notNull())
    .addColumn("expiration", sql`timestamptz`, (col) => col.notNull())
    .addColumn("createdAt", sql`timestamptz`, (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn("updatedAt", sql`timestamptz`, (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createIndex("gmail_watch_registration_emailAddress_idx")
    .on("gmail_watch_registration")
    .column("emailAddress")
    .execute();

  await db.schema
    .createIndex("gmail_watch_registration_userId_idx")
    .on("gmail_watch_registration")
    .column("userId")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("gmail_watch_registration_userId_idx").execute();
  await db.schema
    .dropIndex("gmail_watch_registration_emailAddress_idx")
    .execute();
  await db.schema.dropTable("gmail_watch_registration").execute();
}
