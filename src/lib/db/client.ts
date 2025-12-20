import { Kysely } from "kysely";
import type { DB } from "@app/db/generated/schema";

export class DBClient {
  constructor(private db: Kysely<DB>) {}

  /**
   * Look up a watch registration by email address.
   * Used by the webhook handler to find which user/account to process.
   */
  getWatchRegistrationByEmail(emailAddress: string) {
    return this.db
      .selectFrom("gmailWatchRegistration")
      .where("emailAddress", "=", emailAddress)
      .selectAll()
      .executeTakeFirst();
  }

  /**
   * Get all watch registrations for a user.
   */
  getWatchRegistrationsByUserId(userId: string) {
    return this.db
      .selectFrom("gmailWatchRegistration")
      .where("userId", "=", userId)
      .selectAll()
      .execute();
  }

  /**
   * Create a new watch registration when a Google account is linked.
   */
  createWatchRegistration(data: {
    userId: string;
    accountId: string;
    emailAddress: string;
    historyId: string;
    expiration: Date;
  }) {
    return this.db
      .insertInto("gmailWatchRegistration")
      .values({
        id: crypto.randomUUID(),
        userId: data.userId,
        accountId: data.accountId,
        emailAddress: data.emailAddress,
        historyId: data.historyId,
        expiration: data.expiration,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  /**
   * Update a watch registration's historyId and optionally expiration.
   * Used by the webhook handler after processing a notification.
   */
  updateWatchRegistration(
    id: string,
    data: { historyId: string; expiration?: Date },
  ) {
    return this.db
      .updateTable("gmailWatchRegistration")
      .set({
        historyId: data.historyId,
        ...(data.expiration && { expiration: data.expiration }),
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .execute();
  }

  /**
   * Update account tokens after refresh.
   */
  updateAccountTokens(
    accountId: string,
    data: { accessToken: string; accessTokenExpiresAt: Date },
  ) {
    return this.db
      .updateTable("account")
      .set({
        accessToken: data.accessToken,
        accessTokenExpiresAt: data.accessTokenExpiresAt,
        updatedAt: new Date(),
      })
      .where("id", "=", accountId)
      .execute();
  }
}
