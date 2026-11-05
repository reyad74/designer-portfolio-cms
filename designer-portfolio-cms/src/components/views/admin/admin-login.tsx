"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminLoginSchema } from "@/lib/validation";
import { adminApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, ShieldAlert } from "lucide-react";

export function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: { email: string; password: string }) => {
    setError("");
    try {
      await adminApi.login(values.email, values.password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-sidebar px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-heading text-3xl font-bold">
            AV<span className="text-primary">®</span> CMS
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage portfolio content
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 border border-sidebar-border bg-elevated p-8"
        >
          {error && (
            <div className="flex items-start gap-2 rounded-sm border border-destructive/50 bg-destructive/10 p-3" role="alert">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="username"
              placeholder="admin@studio.com"
              className="h-12 border-sidebar-border bg-background"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-12 border-sidebar-border bg-background"
              {...register("password")}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Signing in…
              </>
            ) : (
              <>
                <Lock className="size-4" aria-hidden /> Sign in
              </>
            )}
          </Button>

          <div className="rounded-sm border border-sidebar-border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Demo access
            </p>
            <p className="mt-2 font-mono text-xs text-foreground/80">
              admin@vale.studio · ValeStudio#2026
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Seeded demo credentials — change them via the database before any real deployment.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
