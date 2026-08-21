"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BlockButton, BlockInput, BlockPanel } from "@/frontend/components/mc";
import { repo } from "@/lib/data";
import { DataError } from "@/lib/data/types";

const emailSchema = z.object({
  email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
});

type EmailFormValues = z.infer<typeof emailSchema>;

const resetSchema = z
  .object({
    otp: z.string().length(6, "OTP must be exactly 6 digits."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
      .regex(/[0-9]/, "Password must contain at least one number.")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  
  // Resend state
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const { register: registerEmail, handleSubmit: handleEmailSubmit, formState: { errors: emailErrors, isSubmitting: isEmailSubmitting } } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const { register: registerReset, handleSubmit: handleResetSubmit, formState: { errors: resetErrors, isSubmitting: isResetSubmitting } } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { otp: "", password: "", confirmPassword: "" },
  });

  async function onEmailSubmit(values: EmailFormValues) {
    setFormError(null);
    if (!repo.auth.requestPasswordReset) {
      setFormError("Password recovery is unavailable in this environment.");
      return;
    }

    try {
      await repo.auth.requestPasswordReset(values.email);
      setEmail(values.email);
      setStep(2);
    } catch (error) {
      setFormError(
        error instanceof DataError
          ? error.message
          : "We could not process that request. Please try again.",
      );
    }
  }

  async function onResetSubmit(values: ResetFormValues) {
    setFormError(null);
    if (!repo.auth.resetPassword) return;

    try {
      await repo.auth.resetPassword(email, values.otp, values.password);
      router.replace("/login?reset=success");
    } catch (error) {
      setFormError(
        error instanceof DataError
          ? error.message
          : "Failed to reset password. Please try again.",
      );
    }
  }

  async function handleResend() {
    if (!repo.auth.requestPasswordReset) return;
    
    setIsResending(true);
    setResendMessage(null);
    setFormError(null);
    
    try {
      await repo.auth.requestPasswordReset(email);
      setResendMessage("A new OTP has been sent.");
    } catch (e: any) {
      setFormError(e.message || "Failed to resend OTP.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <BlockPanel variant="card" padded="lg" className="w-full max-w-[500px] animate-block-in">
      {step === 1 ? (
        <div className="flex flex-col gap-[var(--mc-unit)]">
          <header>
            <h1 className="text-mc-eyebrow text-lg">FORGOT PASSWORD</h1>
            <p className="mt-[var(--mc-unit)] text-mc-text-dim">
              Enter your account email and we’ll send a secure reset OTP.
            </p>
          </header>
          <form onSubmit={(event) => void handleEmailSubmit(onEmailSubmit)(event)} className="flex flex-col gap-[var(--mc-unit)]" noValidate>
            <BlockInput
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={emailErrors.email?.message}
              {...registerEmail("email")}
            />
            {formError ? (
              <BlockPanel variant="slot" padded="sm" role="alert" aria-live="assertive" className="border-mc-redstone text-mc-danger text-[16px]">
                {formError}
              </BlockPanel>
            ) : null}
            <BlockButton type="submit" block size="lg" variant="portal" loading={isEmailSubmitting}>
              Send OTP
            </BlockButton>
          </form>
          {/*
            Shown to EVERYONE, unconditionally, and that is the point.

            Password reset only fires for accounts that have a password:
            `requestPasswordReset` requires a `passwordHash`, so a Google-only
            account is skipped and no mail is ever sent. The response stays
            deliberately generic to avoid revealing whether an address is
            registered — which leaves a Google user waiting on an email that
            cannot arrive. Saying it here costs nothing, because it is the same
            sentence for every visitor and so leaks nothing about any account.
          */}
          <BlockPanel variant="slot" padded="sm" className="text-[16px] text-mc-text-dim">
            Signed up with Google? Use{" "}
            <button
              type="button"
              className="cursor-pointer text-mc-eyebrow underline hover:text-mc-text"
              onClick={() => router.replace("/login")}
            >
              Sign in with Google
            </button>{" "}
            instead — password reset only works for accounts that have a
            password.
          </BlockPanel>
          <button type="button" className="min-h-11 cursor-pointer text-[16px] text-mc-eyebrow hover:text-mc-text hover:underline" onClick={() => router.replace("/login")}>
            Back to login
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-[var(--mc-unit)] animate-block-in">
          <header>
            <h1 className="text-mc-eyebrow text-lg">RESET PASSWORD</h1>
            <p className="mt-[var(--mc-unit)] text-mc-text-dim">
              Enter the 6-digit OTP sent to <strong className="text-mc-text">{email}</strong> and choose a new password.
            </p>
          </header>
          <form onSubmit={(event) => void handleResetSubmit(onResetSubmit)(event)} className="flex flex-col gap-[var(--mc-unit)]" noValidate>
            <BlockInput
              label="6-Digit OTP"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              error={resetErrors.otp?.message}
              {...registerReset("otp")}
            />
            
            <div className="flex flex-col gap-1">
              <PasswordField
                label="New Password"
                autoComplete="new-password"
                error={resetErrors.password?.message}
                registration={registerReset("password")}
                hint="Must be at least 8 characters, include an uppercase letter, a lowercase letter, a number, and a special character."
              />
            </div>

            <PasswordField
              label="Confirm New Password"
              autoComplete="new-password"
              error={resetErrors.confirmPassword?.message}
              registration={registerReset("confirmPassword")}
            />

            {formError ? (
              <BlockPanel variant="slot" padded="sm" role="alert" aria-live="assertive" className="border-mc-redstone text-mc-danger text-[16px]">
                {formError}
              </BlockPanel>
            ) : null}
            {resendMessage ? (
              <BlockPanel variant="slot" padded="sm" role="alert" aria-live="polite" className="border-mc-emerald text-mc-success text-[16px]">
                {resendMessage}
              </BlockPanel>
            ) : null}
            
            <div className="flex flex-col gap-2 mt-2">
              <BlockButton type="submit" block size="lg" variant="portal" loading={isResetSubmitting}>
                Reset Password
              </BlockButton>
              <BlockButton 
                type="button" 
                block 
                size="md" 
                variant="ghost" 
                onClick={(e) => { e.preventDefault(); handleResend(); }} 
                loading={isResending}
              >
                Resend OTP
              </BlockButton>
            </div>
          </form>
          <button type="button" className="min-h-11 cursor-pointer text-[16px] text-mc-eyebrow hover:text-mc-text hover:underline" onClick={() => setStep(1)}>
            Use a different email
          </button>
        </div>
      )}
    </BlockPanel>
  );
}

/** Password field with a reveal toggle. */
function PasswordField({
  label,
  autoComplete,
  error,
  registration,
  hint,
}: {
  label: string;
  autoComplete: string;
  error?: string;
  registration: any;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <BlockInput
      label={label}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      placeholder="••••••••"
      error={error}
      hint={hint}
      adornment={
        <BlockButton
          variant="ghost"
          size="sm"
          onClick={() => setVisible((v) => !v)}
          // The label must state the ACTION, not the state, or screen-reader
          // users cannot tell what pressing it does.
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {/* Pixel eye — Press Start 2P has no glyph for ◉/◡, so a character
              here renders as tofu. Open = lid outline with a pupil; closed =
              a shut lid with lashes, which reads at 14px where a struck-through
              eye does not. */}
          <svg viewBox="0 0 12 8" className="h-[14px] w-[21px]" shapeRendering="crispEdges" aria-hidden>
            {visible ? (
              <>
                <path
                  d="M4 1h4v1H4z M2 2h2v1H2z M8 2h2v1H8z M1 3h1v2H1z M10 3h1v2h-1z M2 5h2v1H2z M8 5h2v1H8z M4 6h4v1H4z"
                  fill="currentColor"
                />
                <path d="M5 3h2v2H5z" fill="currentColor" />
              </>
            ) : (
              <path
                d="M1 3h1v1H1z M2 4h2v1H2z M4 5h4v1H4z M8 4h2v1H8z M10 3h1v1h-1z M2 6h1v1H2z M5 6h1v1H5z M9 6h1v1H9z"
                fill="currentColor"
              />
            )}
          </svg>
        </BlockButton>
      }
      {...registration}
    />
  );
}
