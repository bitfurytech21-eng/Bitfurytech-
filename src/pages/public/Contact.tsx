import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import PublicLayout from "../../components/PublicLayout";
import {
  Button,
  Card,
  FormField,
  SelectInput,
  TextAreaInput,
  TextInput,
} from "../../components/ui";

const INQUIRY_SUBJECTS = [
  "Institutional Custody Inquiry",
  "Account Registration & Verification",
  "Deposit & Settlement Verification",
  "Withdrawal & Payout Support",
  "Investment Mandate Specifications",
  "Real Estate Syndicate Participation",
  "Compliance & Security Review",
] as const;

interface ContactApiResponse {
  ok?: boolean;
  inquiryId?: string;
  submittedAt?: string;
  error?: string;
}

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState<string>(INQUIRY_SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    ok: boolean;
    text: string;
    referenceId?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (trimmedName.length < 1 || trimmedName.length > 120) {
      setStatus({
        ok: false,
        text: "Please enter your full name (between 1 and 120 characters).",
      });
      return;
    }
    if (
      trimmedEmail.length < 3 ||
      trimmedEmail.length > 200 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    ) {
      setStatus({
        ok: false,
        text: "Please provide a valid email address.",
      });
      return;
    }
    if (trimmedMessage.length < 1 || trimmedMessage.length > 1500) {
      setStatus({
        ok: false,
        text: "Please enter your inquiry message (maximum 1,500 characters).",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          subject,
          message: trimmedMessage,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as ContactApiResponse;
      if (!response.ok || !data.ok || !data.inquiryId) {
        throw new Error(
          data.error ||
            "The server did not confirm receipt of your inquiry. Please try again."
        );
      }

      setStatus({
        ok: true,
        referenceId: data.inquiryId,
        text: "Your inquiry has been confirmed and recorded by the BitfuryTech server.",
      });
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setStatus({
        ok: false,
        text:
          err instanceof Error
            ? err.message
            : "Unable to submit inquiry at this moment.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <section className="bg-[#1B4962] text-white border-b border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-3">
          <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
            Client Relations
          </p>
          <h1
            className="font-heading font-bold tracking-tight text-white text-balance"
            style={{ fontSize: "clamp(2rem, 3.8vw, 3.25rem)" }}
          >
            Contact BitfuryTech
          </h1>
          <p className="text-base text-slate-200 max-w-3xl leading-relaxed">
            Reach our client support and settlement administration desk regarding custody
            onboarding, deposit verification, or investment mandate terms.
          </p>
        </div>
      </section>

      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Support Information & Business Contact Details */}
            <div className="lg:col-span-5 space-y-6">
              <Card padding="lg" className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-5 h-5 text-[#E94D65] shrink-0" />
                  <h2 className="text-base font-heading font-bold text-[#102030]">
                    Business Contact Details
                  </h2>
                </div>
                <p className="text-sm text-[#5A6B7C] leading-relaxed">
                  Inquiries submitted here are validated by the BitfuryTech server and persisted
                  directly to the administration review queue.
                </p>
                <dl className="pt-3 border-t border-[#DCE4EC] space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-[#5A6B7C]">Administration &amp; Settlement Desk</dt>
                    <dd className="font-mono text-[#102030] font-semibold mt-0.5">
                      bitfurytech21@gmail.com
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#5A6B7C]">Platform Workspace</dt>
                    <dd className="text-[#102030] mt-0.5">
                      BitfuryTech Institutional Custody &amp; Investment Portal
                    </dd>
                  </div>
                </dl>
              </Card>

              <Card padding="lg" className="space-y-4 bg-[#F6F8FA]">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#1B4962] shrink-0" />
                  <h2 className="text-base font-heading font-bold text-[#102030]">
                    Support Information
                  </h2>
                </div>
                <ul className="space-y-2.5 text-sm text-[#5A6B7C]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#E94D65] shrink-0 mt-0.5" />
                    <span>
                      Include your transaction reference code (e.g. DEP- or WDR-) for settlement
                      inquiries.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#E94D65] shrink-0 mt-0.5" />
                    <span>
                      Review the{" "}
                      <Link
                        to="/how-it-works"
                        className="text-[#1B4962] font-semibold hover:text-[#B92841] hover:underline"
                      >
                        9-step investment lifecycle
                      </Link>{" "}
                      or{" "}
                      <Link
                        to="/faq"
                        className="text-[#1B4962] font-semibold hover:text-[#B92841] hover:underline"
                      >
                        categorized FAQ
                      </Link>{" "}
                      for immediate guidance.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#E94D65] shrink-0 mt-0.5" />
                    <span>
                      Never share passwords or sensitive authentication codes in support messages.
                    </span>
                  </li>
                </ul>
              </Card>
            </div>

            {/* Interactive Contact Form */}
            <Card padding="lg" className="lg:col-span-7 shadow-[0_2px_8px_rgba(27,73,98,0.06)]">
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="space-y-1">
                  <h2 className="text-lg font-heading font-bold text-[#102030]">Send an Inquiry</h2>
                  <p className="text-xs text-[#5A6B7C]">
                    Confirmation appears only after server persistence is verified.
                  </p>
                </div>

                {status && (
                  <div
                    role="status"
                    className={`rounded-[5px] p-3.5 text-sm border space-y-1 ${
                      status.ok
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    <p>{status.text}</p>
                    {status.referenceId && (
                      <p className="text-xs font-mono text-emerald-900">
                        Reference ID: {status.referenceId}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField id="inq-name" label="Name">
                    <TextInput
                      id="inq-name"
                      type="text"
                      maxLength={120}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      required
                    />
                  </FormField>
                  <FormField id="inq-email" label="Email">
                    <TextInput
                      id="inq-email"
                      type="email"
                      maxLength={200}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      required
                    />
                  </FormField>
                </div>

                <FormField id="inq-subject" label="Subject">
                  <SelectInput
                    id="inq-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  >
                    {INQUIRY_SUBJECTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </SelectInput>
                </FormField>

                <FormField
                  id="inq-msg"
                  label="Message"
                  hint={`${message.length}/1500 characters`}
                >
                  <TextAreaInput
                    id="inq-msg"
                    rows={5}
                    maxLength={1500}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your question, reference ID, or mandate inquiry..."
                    required
                  />
                </FormField>

                <Button type="submit" variant="primary" size="lg" loading={submitting}>
                  Send Inquiry
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
