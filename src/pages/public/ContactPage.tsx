import { useState } from "react";
import PublicLayout from "../../components/PublicLayout";
import {
  Button,
  Card,
  FormField,
  SelectInput,
  TextAreaInput,
  TextInput,
} from "../../components/ui";
import { submitContactInquiry } from "../../services/firestoreService";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("Institutional Custody Inquiry");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (!name.trim() || !email.includes("@") || !message.trim()) {
      setStatus({ ok: false, text: "Provide your name, a valid email, and inquiry details." });
      return;
    }

    setSubmitting(true);
    try {
      await submitContactInquiry(name, email, topic, message);
      setStatus({
        ok: true,
        text: "Your inquiry has been logged with the BitfuryTech client relations desk.",
      });
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setStatus({
        ok: false,
        text: err instanceof Error ? err.message : "Unable to submit inquiry at this moment.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-10">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400">
            Client Relations
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            Contact BitfuryTech
          </h1>
          <p className="text-base text-slate-300">
            Submit an institutional onboarding question, mandate request, or compliance inquiry.
          </p>
        </div>

        <Card tone="dark" padding="lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            {status && (
              <div
                role="status"
                className={`rounded-md p-3.5 text-sm border ${
                  status.ok
                    ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
                    : "bg-rose-950/60 border-rose-500/40 text-rose-200"
                }`}
              >
                {status.text}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField id="inq-name" label="Full Name" tone="dark">
                <TextInput
                  id="inq-name"
                  tone="dark"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </FormField>
              <FormField id="inq-email" label="Email Address" tone="dark">
                <TextInput
                  id="inq-email"
                  tone="dark"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </FormField>
            </div>

            <FormField id="inq-topic" label="Subject" tone="dark">
              <SelectInput
                id="inq-topic"
                tone="dark"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option>Institutional Custody Inquiry</option>
                <option>Real Estate Syndicate Participation</option>
                <option>Deposit &amp; Settlement Verification</option>
                <option>Compliance &amp; Account Review</option>
              </SelectInput>
            </FormField>

            <FormField id="inq-msg" label="Message" tone="dark">
              <TextAreaInput
                id="inq-msg"
                tone="dark"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </FormField>

            <Button type="submit" variant="gold" size="lg" loading={submitting}>
              Submit Inquiry
            </Button>
          </form>
        </Card>
      </div>
    </PublicLayout>
  );
}
