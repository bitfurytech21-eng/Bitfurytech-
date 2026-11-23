import { useEffect, useState } from "react";
import { AlertTriangle, Mail, Save } from "lucide-react";
import MetronicShell from "../../components/MetronicShell";
import { Button, Card, FormField, TextAreaInput, TextInput } from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import {
  EmailOutboxRecord,
  EmailTemplateRecord,
  formatTimestamp,
  saveEmailTemplate,
  subscribeEmailOutbox,
  subscribeEmailTemplates,
} from "../../services/firestoreService";
import {
  DEFAULT_MAIL_TEMPLATES,
  renderMailTemplate,
  type MailTemplateEvent,
} from "../../services/mailTemplates";

export default function EmailTemplatesPage() {
  const { isAdmin, firebaseUser } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([]);
  const [outbox, setOutbox] = useState<EmailOutboxRecord[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<MailTemplateEvent>(
    DEFAULT_MAIL_TEMPLATES[0].eventType
  );
  const [drafts, setDrafts] = useState<
    Partial<Record<MailTemplateEvent, { subject: string; body: string; enabled: boolean }>>
  >({});
  const [saving, setSaving] = useState(false);
  const [templatesUnavailable, setTemplatesUnavailable] = useState(false);
  const [outboxUnavailable, setOutboxUnavailable] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const rulesUnavailable = templatesUnavailable || outboxUnavailable;

  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribeTemplates = subscribeEmailTemplates(
      (items) => {
        setTemplates(items);
        setTemplatesUnavailable(false);
      },
      (error) => {
        console.error("Email template subscription failed:", error);
        setTemplatesUnavailable(true);
      }
    );
    const unsubscribeOutbox = subscribeEmailOutbox(
      (items) => {
        setOutbox(items);
        setOutboxUnavailable(false);
      },
      (error) => {
        console.error("Email outbox subscription failed:", error);
        setOutboxUnavailable(true);
      }
    );

    return () => {
      unsubscribeTemplates();
      unsubscribeOutbox();
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <MetronicShell
        title="Email Templates"
        subtitle="Administrator access is required to manage platform message templates."
        section="admin"
      >
        <Card padding="lg" className="max-w-xl">
          <p className="text-sm text-slate-600">Administrator authorization is required.</p>
        </Card>
      </MetronicShell>
    );
  }

  const definition =
    DEFAULT_MAIL_TEMPLATES.find((item) => item.eventType === selectedEvent) ??
    DEFAULT_MAIL_TEMPLATES[0];
  const savedTemplate = templates.find((item) => item.eventType === selectedEvent);
  const draft = drafts[selectedEvent];
  const subject = draft?.subject ?? savedTemplate?.subject ?? definition.subject;
  const body = draft?.body ?? savedTemplate?.body ?? definition.body;
  const enabled = draft?.enabled ?? savedTemplate?.enabled ?? definition.enabled;
  const previewValues = {
    firstName: "Alex",
    email: "alex@example.com",
    amount: "$1,250.00",
    method: "USDT (TRC20)",
    reference: "DEP-482193",
    status: "Approved",
  };

  const updateDraft = (patch: Partial<{ subject: string; body: string; enabled: boolean }>) => {
    setDrafts((current) => ({
      ...current,
      [selectedEvent]: {
        subject: current[selectedEvent]?.subject ?? subject,
        body: current[selectedEvent]?.body ?? body,
        enabled: current[selectedEvent]?.enabled ?? enabled,
        ...patch,
      },
    }));
    setFeedback(null);
  };

  const handleSave = async () => {
    if (!definition.editable || !firebaseUser?.uid || !subject.trim() || !body.trim()) return;
    setSaving(true);
    setFeedback(null);
    try {
      await saveEmailTemplate(selectedEvent, subject, body, enabled, firebaseUser.uid);
      setFeedback("Template saved to Firestore.");
    } catch (error) {
      console.error("Email template save failed:", error);
      setFeedback(
        "Could not save this template. Publish the mail collection rules from firestore.rules, then try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <MetronicShell
      title="Email Templates"
      subtitle="Manage event copy and review queued platform email events."
      section="admin"
    >
      <div role="status" className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <p className="text-sm leading-relaxed">
          Outbound delivery is not configured. Wired events can be queued for a future sender, but
          this platform will not deliver them. Verification and password-reset emails continue to
          use Firebase Authentication.
        </p>
      </div>

      {rulesUnavailable && (
        <div role="alert" className="flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-900">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p className="text-sm leading-relaxed">
            Firestore mail collections are unavailable. The editor is showing built-in defaults;
            save and queue operations need the rules in <code>firestore.rules</code> to be published.
          </p>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <Card padding="lg" className="flex flex-col gap-5">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <span className="flex size-10 items-center justify-center rounded-md bg-[#1B4962] text-white">
              <Mail aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Message template</h2>
              <p className="text-xs text-slate-500">Use tokens such as {'{{firstName}}'}, {'{{amount}}'}, and {'{{reference}}'}.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="mail-event" className="text-sm font-medium text-slate-700">
              Platform event
            </label>
            <select
              id="mail-event"
              value={selectedEvent}
              onChange={(event) => setSelectedEvent(event.target.value as MailTemplateEvent)}
              className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4962]"
            >
              {DEFAULT_MAIL_TEMPLATES.map((template) => (
                <option key={template.eventType} value={template.eventType}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                definition.triggerStatus === "wired"
                  ? "bg-emerald-100 text-emerald-800"
                  : definition.triggerStatus === "better_auth"
                    ? "bg-sky-100 text-sky-800"
                    : "bg-slate-100 text-slate-700"
              }`}
            >
              {definition.triggerStatus === "wired"
                ? "Event connected"
                : definition.triggerStatus === "firebase_auth"
                  ? "Better Auth managed"
                  : "Workflow not connected"}
            </span>
            <span className="text-xs text-slate-600">{definition.triggerDescription}</span>
          </div>

          <FormField id="mail-subject" label="Subject">
            <TextInput
              id="mail-subject"
              className="text-base"
              maxLength={160}
              disabled={!definition.editable}
              value={subject}
              onChange={(event) => updateDraft({ subject: event.target.value })}
            />
          </FormField>

          <FormField id="mail-body" label="Plain-text body">
            <TextAreaInput
              id="mail-body"
              className="min-h-32 text-base"
              rows={6}
              maxLength={3000}
              disabled={!definition.editable}
              value={body}
              onChange={(event) => updateDraft({ body: event.target.value })}
            />
          </FormField>

          {definition.editable && (
            <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => updateDraft({ enabled: event.target.checked })}
                className="size-5 accent-[#1B4962]"
              />
              Enable this event template
            </label>
          )}

          {feedback && (
            <p role="status" className="text-sm text-slate-700">
              {feedback}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {definition.editable ? (
              <Button type="button" loading={saving} onClick={() => void handleSave()}>
                <Save aria-hidden="true" className="size-4" />
                Save template
              </Button>
            ) : (
              <p className="text-sm text-slate-600">
                This message is sent by Firebase Authentication and is not edited here.
              </p>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card padding="lg" className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Preview</h2>
              <p className="text-xs text-slate-500">Example values are substituted as plain text.</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="break-words text-sm font-semibold text-slate-900">
                {renderMailTemplate(subject, previewValues)}
              </p>
              <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-700">
                {renderMailTemplate(body, previewValues)}
              </pre>
            </div>
          </Card>

          <Card padding="lg" className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Recent event queue</h2>
                <p className="text-xs text-slate-500">Latest 50 email events, newest first.</p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {outbox.length} records
              </span>
            </div>
            {outbox.length ? (
              <ul className="flex flex-col gap-3">
                {outbox.map((message) => (
                  <li key={message.id} className="rounded-md border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        {DEFAULT_MAIL_TEMPLATES.find((item) => item.eventType === message.eventType)?.label ?? message.eventType}
                      </span>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900">
                        Awaiting provider
                      </span>
                    </div>
                    <p className="mt-1 break-all text-xs text-slate-600">{message.recipient}</p>
                    <p className="mt-1 text-sm text-slate-800">{message.subject}</p>
                    <p className="mt-2 text-[11px] text-slate-500">{formatTimestamp(message.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                No email events have been queued yet.
              </p>
            )}
          </Card>
        </div>
      </div>
    </MetronicShell>
  );
}
