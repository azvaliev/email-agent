import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("gmailWatchRegistration")
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
    .createIndex("gmail_watch_registration_email_address_idx")
    .on("gmailWatchRegistration")
    .column("emailAddress")
    .execute();

  await db.schema
    .createIndex("gmail_watch_registration_user_id_idx")
    .on("gmailWatchRegistration")
    .column("userId")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("gmail_watch_registration_user_id_idx").execute();
  await db.schema
    .dropIndex("gmail_watch_registration_email_address_idx")
    .execute();
  await db.schema.dropTable("gmailWatchRegistration").execute();
}
