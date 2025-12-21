import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("push_subscription")
    .addColumn("id", "uuid", (col) =>
      col
        .primaryKey()
        .notNull()
        .defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("user_id", "text", (col) =>
      col.notNull().references("user.id").onDelete("cascade"),
    )
    .addColumn("endpoint", "text", (col) => col.notNull().unique())
    .addColumn("p256dh", "text", (col) => col.notNull())
    .addColumn("auth", "text", (col) => col.notNull())
    .addColumn("user_agent", "text")
    .addColumn("created_at", sql`timestamptz`, (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createIndex("push_subscription_user_id_idx")
    .on("push_subscription")
    .column("user_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("push_subscription_user_id_idx").execute();
  await db.schema.dropTable("push_subscription").execute();
}
