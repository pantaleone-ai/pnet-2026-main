"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import {
  Check,
  Copy,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  HONEYPOT_FIELD,
  INQUIRY_TYPES,
  MAX_MESSAGE_LENGTH,
  contactFormSchema,
  type ContactFormInput,
  type ContactFormValues,
} from "@/lib/validations/contact";

/* Obfuscated recipient: assembled at runtime so scrapers never see a literal. */
const EMAIL_USER = "matt";
const EMAIL_DOMAIN = "pantaleone.net";
const CONTACT_EMAIL = `${EMAIL_USER}@${EMAIL_DOMAIN}`;

type SubmitState = "idle" | "sending" | "sent";

export function ContactForm({ className }: { className?: string }) {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseId = useId();
  const messageCounterId = `${baseId}-message-counter`;

  const form = useForm<ContactFormInput, unknown, ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      inquiryType: INQUIRY_TYPES[0],
      message: "",
      [HONEYPOT_FIELD]: "",
      mountedAt: Date.now(),
    },
  });

  const { isSubmitting } = form.formState;
  const messageValue = form.watch("message") ?? "";
  const messageLength = messageValue.length;
  const messageNearLimit = messageLength > MAX_MESSAGE_LENGTH - 200;

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
    } catch {
      const el = document.createElement("textarea");
      el.value = CONTACT_EMAIL;
      el.setAttribute("readonly", "");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  function resetForm() {
    form.reset({
      name: "",
      email: "",
      inquiryType: INQUIRY_TYPES[0],
      message: "",
      [HONEYPOT_FIELD]: "",
      mountedAt: Date.now(),
    });
    setSubmitState("idle");
  }

  async function onSubmit(data: ContactFormValues) {
    setSubmitState("sending");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        error?: string;
      };
      if (!response.ok || result.success === false) {
        throw new Error(result.error ?? "Message not sent. Please try again.");
      }
      setSubmitState("sent");
      toast.success("Message sent. I reply within two business days.");
      form.reset({
        name: "",
        email: "",
        inquiryType: data.inquiryType,
        message: "",
        [HONEYPOT_FIELD]: "",
        mountedAt: Date.now(),
      });
    } catch (error) {
      setSubmitState("idle");
      toast.error(
        error instanceof Error
          ? error.message
          : "Message not sent. Check your connection and try again.",
      );
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      aria-labelledby={`${baseId}-heading`}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8",
        "dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_0_60px_-16px_rgba(148,163,184,0.35)]",
        className,
      )}
    >
      {/* Subtle top border glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-zinc-400/60 to-transparent dark:via-zinc-500/50"
      />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id={`${baseId}-heading`}
            className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Send a message
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            No puzzles, no CAPTCHAs. Just send.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copyEmail}
          aria-live="polite"
          aria-label={copied ? "Email copied" : `Copy email ${CONTACT_EMAIL}`}
          className="border-zinc-200 dark:border-zinc-800"
        >
          {copied ? (
            <>
              <Check className="size-4 text-emerald-500" aria-hidden="true" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="size-4" aria-hidden="true" />
              Copy email
            </>
          )}
        </Button>
      </div>

      {submitState === "sent" && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
          className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-medium">Message sent successfully.</p>
            <p className="mt-0.5 text-emerald-600/90 dark:text-emerald-300/80">
              Thanks for reaching out. I reply within two business days.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetForm}
            className="shrink-0"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            New message
          </Button>
        </motion.div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
        >
          {/* Honeypot: invisible to humans, irresistible to bots. Off-screen
              (never display:none), excluded from tab order + AT tree. */}
          <div
            aria-hidden="true"
            className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0"
          >
            <label htmlFor={`${baseId}-hp`}>
              Company website (leave blank)
            </label>
            <input
              id={`${baseId}-hp`}
              type="text"
              autoComplete="off"
              tabIndex={-1}
              placeholder="https://example.com"
              {...form.register(HONEYPOT_FIELD)}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ada Lovelace"
                      autoComplete="name"
                      maxLength={100}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      spellCheck={false}
                      placeholder="ada@analytical.engine"
                      maxLength={254}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="inquiryType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inquiry type</FormLabel>
                <FormControl>
                  <div
                    role="radiogroup"
                    aria-label="Inquiry type"
                    className="flex flex-wrap gap-2"
                  >
                    {INQUIRY_TYPES.map((type) => {
                      const selected = field.value === type;
                      return (
                        <label key={type}>
                          <input
                            type="radio"
                            name={field.name}
                            value={type}
                            checked={selected}
                            onChange={() => field.onChange(type)}
                            onBlur={field.onBlur}
                            className="peer sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={cn(
                              "inline-flex cursor-pointer items-center rounded-full border px-3.5 py-1.5 text-sm transition-all",
                              "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900",
                              "dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100",
                              selected &&
                                "border-zinc-900 bg-zinc-900 text-white shadow-sm dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:shadow-[0_0_20px_-4px_rgba(255,255,255,0.35)]",
                            )}
                          >
                            {type}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-baseline justify-between gap-4">
                  <FormLabel>Message</FormLabel>
                  <span
                    id={messageCounterId}
                    aria-live="polite"
                    className={cn(
                      "text-xs tabular-nums",
                      messageNearLimit
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-zinc-400 dark:text-zinc-500",
                    )}
                  >
                    {messageLength} / {MAX_MESSAGE_LENGTH}
                  </span>
                </div>
                <FormControl>
                  <Textarea
                    placeholder="What are you building? Stack, timeline, and what should happen after you hit send."
                    aria-describedby={messageCounterId}
                    maxLength={MAX_MESSAGE_LENGTH}
                    className="min-h-[120px] resize-y"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={resetForm}
              disabled={isSubmitting}
              className="sm:w-auto"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-40 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:shadow-[0_0_24px_-6px_rgba(255,255,255,0.4)]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="size-4" aria-hidden="true" />
                  Send message
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </motion.section>
  );
}

export default ContactForm;
