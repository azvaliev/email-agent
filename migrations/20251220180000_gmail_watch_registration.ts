import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("gmail_watch_registration")
    .addColumn("id", "text", (col) => col.primaryKey().notNull())
    .addColumn("account_id", "text", (col) =>
      col.notNull().unique().references("account.id").onDelete("cascade"),
    )
    .addColumn("user_id", "text", (col) =>
      col.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("email_address", "text", (col) => col.notNull())
    .addColumn("history_id", "text", (col) => col.notNull())
    .addColumn("expiration", sql`timestamptz`, (col) => col.notNull())
    .addColumn("created_at", sql`timestamptz`, (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .addColumn("updated_at", sql`timestamptz`, (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createIndex("gmail_watch_registration_email_address_idx")
    .on("gmail_watch_registration")
    .column("email_address")
    .execute();

  await db.schema
    .createIndex("gmail_watch_registration_user_id_idx")
    .on("gmail_watch_registration")
    .column("user_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("gmail_watch_registration_user_id_idx").execute();
  await db.schema
    .dropIndex("gmail_watch_registration_email_address_idx")
    .execute();
  await db.schema.dropTable("gmail_watch_registration").execute();
}
