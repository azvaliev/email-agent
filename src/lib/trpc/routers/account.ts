import { router, authedProcedure } from "../init";
import { db } from "@app/db";

export type LinkedAccount = {
  id: string;
  providerId: string;
  emailAddress: string;
  createdAt: Date;
  type: "google";
};

export const accountRouter = router({
  list: authedProcedure.query(async ({ ctx }): Promise<LinkedAccount[]> => {
    const registrations = await db
      .selectFrom("gmailWatchRegistration")
      .innerJoin("account", "account.id", "gmailWatchRegistration.accountId")
      .where("gmailWatchRegistration.userId", "=", ctx.session.user.id)
      .select([
        "account.id",
        "account.providerId",
        "gmailWatchRegistration.emailAddress",
        "gmailWatchRegistration.createdAt",
      ])
      .execute();

    return registrations.map<LinkedAccount>((reg) => ({
      id: reg.id,
      providerId: reg.providerId,
      emailAddress: reg.emailAddress,
      createdAt: reg.createdAt,
      type: "google",
    }));
  }),
});
