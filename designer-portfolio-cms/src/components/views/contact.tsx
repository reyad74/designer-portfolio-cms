"use client";

import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { publicApi } from "@/services/api";
import { contactSchema } from "@/lib/validation";
import { useSeo } from "@/hooks/use-seo";
import { Reveal } from "@/components/animations";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, MessageCircle, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

type ContactValues = z.input<typeof contactSchema>;

const PROJECT_TYPES = [
  "Brand Identity",
  "Logo Design",
  "Social Media Design",
  "Advertising Design",
  "Packaging Design",
  "UI/UX Design",
  "Print Design",
  "Motion Graphics",
  "3D Visuals",
  "Something else",
];

const BUDGETS = ["< $2k", "$2k – $5k", "$5k – $10k", "$10k – $25k", "$25k+", "Prefer to discuss"];
const TIMELINES = ["ASAP", "1–2 months", "3–6 months", "Flexible"];

export function ContactView() {
  useSeo(
    "Contact — {site}®",
    "Start a project: tell me about your brand, goals and timeline."
  );
  const { data } = useQuery({ queryKey: ["profile"], queryFn: publicApi.profile, staleTime: 60_000 });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: publicApi.settings, staleTime: 60_000 });

  const [result, setResult] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      fullName: "",
      email: "",
      company: "",
      projectType: "",
      budgetRange: "",
      timeline: "",
      message: "",
      referenceUrl: "",
      website: "",
    },
  });

  const projectType = watch("projectType");
  const budget = watch("budgetRange");
  const timeline = watch("timeline");

  const onSubmit = async (values: ContactValues) => {
    setResult("idle");
    try {
      await publicApi.contact(values);
      setResult("success");
      reset();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setResult("error");
    }
  };

  const socials = data?.socialLinks ?? [];
  const whatsapp = settings?.whatsappUrl;
  const email = settings?.contactEmail || data?.profile?.email;

  return (
    <>
      <section className="relative overflow-hidden border-b border-border pt-32 sm:pt-40 noise-overlay">
        <div className="mx-auto max-w-[1600px] px-5 pb-16 sm:px-8 lg:px-12">
          <Reveal>
            <p className="font-heading text-xs tracking-[0.3em] text-primary">CONTACT</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-5 font-heading text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-none">
              LET&rsquo;S <span className="font-editorial italic font-medium text-primary">TALK</span>
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              Tell me about your project — goals, scope, timeline. I reply to every serious
              inquiry within one business day.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1600px] gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.5fr_1fr] lg:px-12">
        {/* Form */}
        <div>
          {result === "success" ? (
            <div className="flex h-full flex-col items-center justify-center border border-primary/40 bg-elevated p-12 text-center" role="status">
              <CheckCircle2 className="size-12 text-primary" aria-hidden />
              <h2 className="mt-6 font-heading text-2xl font-semibold">Message received.</h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Thank you for reaching out — your inquiry is in my inbox. Expect a reply within one
                business day.
              </p>
              <Button
                variant="outline"
                onClick={() => setResult("idle")}
                className="mt-8 border-border"
              >
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6 sm:grid-cols-2">
              {/* Honeypot — invisible to humans */}
              <div className="hidden" aria-hidden="true">
                <Label htmlFor="website">Website</Label>
                <Input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" placeholder="Jane Doe" className="h-12 border-border bg-elevated" {...register("fullName")} />
                {errors.fullName && <FieldError msg={errors.fullName.message} />}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input id="email" type="email" placeholder="jane@company.com" className="h-12 border-border bg-elevated" {...register("email")} />
                {errors.email && <FieldError msg={errors.email.message} />}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" placeholder="Company / brand (optional)" className="h-12 border-border bg-elevated" {...register("company")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectType">Project Type *</Label>
                <input type="hidden" {...register("projectType")} />
                <Select value={projectType || undefined} onValueChange={(v) => setValue("projectType", v, { shouldValidate: true })}>
                  <SelectTrigger id="projectType" className="h-12 border-border bg-elevated">
                    <SelectValue placeholder="Select a project type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.projectType && <FieldError msg={errors.projectType.message} />}
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Budget Range</Label>
                <input type="hidden" {...register("budgetRange")} />
                <Select value={budget || undefined} onValueChange={(v) => setValue("budgetRange", v)}>
                  <SelectTrigger id="budget" className="h-12 border-border bg-elevated">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGETS.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeline">Timeline</Label>
                <input type="hidden" {...register("timeline")} />
                <Select value={timeline || undefined} onValueChange={(v) => setValue("timeline", v)}>
                  <SelectTrigger id="timeline" className="h-12 border-border bg-elevated">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMELINES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="message">Project Description *</Label>
                <Textarea
                  id="message"
                  rows={6}
                  placeholder="What are you building? What problem should this design solve?"
                  className="border-border bg-elevated"
                  {...register("message")}
                />
                {errors.message && <FieldError msg={errors.message.message} />}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="referenceUrl">Reference URL</Label>
                <Input id="referenceUrl" type="url" placeholder="https://… (optional)" className="h-12 border-border bg-elevated" {...register("referenceUrl")} />
                {errors.referenceUrl && <FieldError msg={errors.referenceUrl.message} />}
              </div>

              {result === "error" && (
                <div className="flex items-start gap-3 rounded-sm border border-destructive/50 bg-destructive/10 p-4 sm:col-span-2" role="alert">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                  <p className="text-sm text-destructive">{errorMsg}</p>
                </div>
              )}

              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-13 w-full rounded-sm bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground hover:bg-primary sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden /> Sending…
                    </>
                  ) : (
                    "Send inquiry"
                  )}
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">
                  Submissions are rate-limited and stored securely. Your details are never shared.
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-8">
          <Reveal>
            <div className="border border-border bg-elevated p-7">
              <h2 className="font-heading text-lg font-semibold">Direct channels</h2>
              <ul className="mt-5 space-y-4">
                {email && (
                  <li className="flex items-center gap-3">
                    <Mail className="size-4 text-primary" aria-hidden />
                    <a href={`mailto:${email}`} className="text-sm transition-colors hover:text-primary">
                      {email}
                    </a>
                  </li>
                )}
                {whatsapp && (
                  <li className="flex items-center gap-3">
                    <MessageCircle className="size-4 text-primary" aria-hidden />
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm transition-colors hover:text-primary"
                    >
                      WhatsApp
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="border border-border bg-elevated p-7">
              <h2 className="font-heading text-lg font-semibold">Elsewhere</h2>
              <ul className="mt-5 grid grid-cols-2 gap-3">
                {socials.map((s) => (
                  <li key={s.id}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between border border-border bg-background px-4 py-3 text-sm transition-colors hover:border-primary hover:text-primary"
                    >
                      {s.label}
                      <span className="text-muted-foreground" aria-hidden>↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="border border-primary/30 bg-primary/5 p-7">
              <p className="font-heading text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                Response promise
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Every inquiry gets a personal reply within one business day. If it&rsquo;s not a fit,
                I&rsquo;ll say so and point you to someone better suited.
              </p>
            </div>
          </Reveal>
        </aside>
      </section>
    </>
  );
}

function FieldError({ msg }: { msg?: string }) {
  return (
    <p className="text-xs text-destructive" role="alert">
      {msg}
    </p>
  );
}
