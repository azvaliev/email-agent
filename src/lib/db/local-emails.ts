import Dexie, { type EntityTable } from "dexie";

export type LocalEmail = {
  messageId: string;
  from: string;
  fromUser: string | null;
  fromEmail: string | null;
  subject: string;
  receivedAt: string;
  url: string | undefined;
};

const db = new Dexie("mailbeaver-emails") as Dexie & {
  emails: EntityTable<LocalEmail, "messageId">;
};

db.version(1).stores({
  emails: "messageId, receivedAt",
});

export { db };
