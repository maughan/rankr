"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import Modal from "@/app/components/modal";
import Link from "next/link";

type ReportableType = "list" | "item" | "profile";

const REASONS: { value: string; label: string; description: string }[] = [
  { value: "spam",        label: "Spam",               description: "Repetitive, unsolicited, or commercial content" },
  { value: "harassment",  label: "Harassment",          description: "Targeting or bullying a specific person" },
  { value: "hateful",     label: "Hateful content",     description: "Promotes hatred based on identity or protected characteristics" },
  { value: "sexual",      label: "Sexual content",      description: "Explicit or adult content" },
  { value: "minors",      label: "Minors at risk",      description: "Sexual or exploitative content involving minors" },
  { value: "violence",    label: "Violence",             description: "Threats or graphic violent content" },
  { value: "copyright",   label: "Copyright",            description: "Infringes on your intellectual property" },
  { value: "other",       label: "Something else",       description: "Doesn't fit the above categories" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  reportableType: ReportableType;
  reportableId: number;
}

type Step = "pick" | "context" | "done";

export default function ReportModal({
  open,
  onClose,
  reportableType,
  reportableId,
}: Props) {
  const [step, setStep] = useState<Step>("pick");
  const [selectedReason, setSelectedReason] = useState("");
  const [context, setContext] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setStep("pick");
    setSelectedReason("");
    setContext("");
    setError("");
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePickReason = (reason: string) => {
    setSelectedReason(reason);
    setStep("context");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportable_type: reportableType,
          reportable_id: reportableId,
          reason: selectedReason,
          context: context.trim() || undefined,
        }),
      });
      if (res.status === 429) {
        setError("You've submitted too many reports recently. Please try again later.");
        return;
      }
      if (!res.ok && res.status !== 200) {
        setError("Something went wrong. Please try again.");
        return;
      }
      setStep("done");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} handleClose={handleClose}>
      {step === "pick" && (
        <div className="p-6 pt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[17px] font-[500] text-rk-primary">Report</p>
            <p className="text-[13px] text-rk-muted">
              What&rsquo;s the problem with this{" "}
              {reportableType === "profile" ? "profile" : reportableType}?
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {REASONS.map((r) => (
              <button
                key={r.value}
                onClick={() => handlePickReason(r.value)}
                className="flex flex-col items-start px-3 py-2.5 rounded-[8px] text-left hover:bg-rk-surface transition-colors cursor-pointer"
              >
                <span className="text-[13px] font-[500] text-rk-primary">{r.label}</span>
                <span className="text-[11px] text-rk-tertiary leading-snug">{r.description}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-rk-tertiary">
            Reports are reviewed by our team.{" "}
            <Link
              href="/community-guidelines"
              target="_blank"
              className="underline underline-offset-2 hover:text-rk-muted transition-colors"
            >
              Community guidelines
            </Link>
          </p>
        </div>
      )}

      {step === "context" && (
        <div className="p-6 pt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[17px] font-[500] text-rk-primary">
              {REASONS.find((r) => r.value === selectedReason)?.label}
            </p>
            <p className="text-[13px] text-rk-muted">
              Any additional context? (optional)
            </p>
          </div>
          <textarea
            className="bg-rk-row border border-rk-stroke rounded-[8px] px-3 py-2.5 text-rk-primary text-[13px] outline-none placeholder:text-rk-tertiary resize-none focus:border-rk-muted transition-colors"
            rows={3}
            maxLength={500}
            placeholder="Describe the issue…"
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
          {error && <p className="text-[12px] text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setStep("pick")}
              disabled={submitting}
              className="flex-1 py-2 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors disabled:opacity-40 cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2 text-[13px] font-[600] text-white bg-rk-accent rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
            >
              {submitting ? "Submitting…" : "Submit report"}
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="p-6 pt-8 flex flex-col gap-4 items-center text-center">
          <div className="w-10 h-10 rounded-full bg-green-900/40 border border-green-700/40 flex items-center justify-center">
            <Flag size={18} className="text-green-400" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[17px] font-[500] text-rk-primary">Thanks for the report</p>
            <p className="text-[13px] text-rk-muted leading-snug max-w-xs">
              We&rsquo;ll review it and take action if it violates our{" "}
              <Link
                href="/community-guidelines"
                target="_blank"
                className="underline underline-offset-2 hover:text-rk-secondary transition-colors"
              >
                community guidelines
              </Link>
              .
            </p>
          </div>
          <button
            onClick={handleClose}
            className="mt-1 px-5 py-2 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}
