import {
  commitFirestoreWrites,
  getFirestoreDoc,
  makeDocId,
} from "./firestoreRestClient.ts";
import {
  getMailTemplateDefinition,
  renderMailTemplate,
  type MailTemplateEvent,
} from "./mailTemplates.ts";

export interface EnqueueMailEventInput {
  eventType: MailTemplateEvent;
  userId: string;
  recipient: string;
  rawToken: string;
  values: Record<string, unknown>;
}

export async function enqueueMailEvent({
  eventType,
  userId,
  recipient,
  rawToken,
  values,
}: EnqueueMailEventInput): Promise<boolean> {
  const defaults = getMailTemplateDefinition(eventType);
  if (!defaults || defaults.triggerStatus !== "wired") return false;

  const cleanRecipient = recipient.trim().toLowerCase().slice(0, 200);
  if (!cleanRecipient || !userId || !rawToken) return false;

  const savedTemplate = await getFirestoreDoc("emailTemplates", eventType, rawToken).catch(
    () => null
  );
  if (savedTemplate?.enabled === false) return false;

  const subjectSource =
    typeof savedTemplate?.subject === "string" ? savedTemplate.subject : defaults.subject;
  const bodySource =
    typeof savedTemplate?.body === "string" ? savedTemplate.body : defaults.body;
  const subject = renderMailTemplate(subjectSource, values).trim().slice(0, 160);
  const body = renderMailTemplate(bodySource, values).trim().slice(0, 3000);
  if (!subject || !body) return false;

  await commitFirestoreWrites(
    [
      {
        collection: "emailOutbox",
        docId: makeDocId("mail"),
        fields: {
          userId: userId.slice(0, 128),
          recipient: cleanRecipient,
          eventType,
          subject,
          body,
          status: "awaiting_provider",
        },
        serverTimestamps: ["createdAt"],
        precondition: { exists: false },
      },
    ],
    rawToken
  );

  return true;
}
