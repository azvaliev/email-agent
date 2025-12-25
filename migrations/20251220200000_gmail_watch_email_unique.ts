import { type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropIndex("gmail_watch_registration_email_address_idx")
    .execute();

  await db.schema
    .createIndex("gmail_watch_registration_email_address_idx")
    .on("gmailWatchRegistration")
    .column("emailAddress")
    .unique()
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropIndex("gmail_watch_registration_email_address_idx")
    .execute();

  await db.schema
    .createIndex("gmail_watch_registration_email_address_idx")
    .on("gmailWatchRegistration")
    .column("emailAddress")
    .execute();
}
