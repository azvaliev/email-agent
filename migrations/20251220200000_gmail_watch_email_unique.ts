import { type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropIndex("gmail_watch_registration_email_address_idx")
    .execute();

  await db.schema
    .createIndex("gmail_watch_registration_email_address_idx")
    .on("gmail_watch_registration")
    .column("email_address")
    .unique()
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropIndex("gmail_watch_registration_email_address_idx")
    .execute();

  await db.schema
    .createIndex("gmail_watch_registration_email_address_idx")
    .on("gmail_watch_registration")
    .column("email_address")
    .execute();
}
