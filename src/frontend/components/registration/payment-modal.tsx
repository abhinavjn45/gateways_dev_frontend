/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { BlockButton, BlockInput, BlockModal, BlockPanel } from "@/frontend/components/mc";
import { repo } from "@/lib/data";
import { DataError } from "@/lib/data/types";
import { useSession } from "@/frontend/components/auth/session-provider";
import { Video } from "lucide-react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const schema = z.object({
  transactionId: z
    .string()
    .trim()
    .min(1, "Transaction ID is required")
    .max(30, "Max 30 characters allowed")
    .regex(/^[a-zA-Z0-9]+$/, "Only alphanumeric characters allowed"),
  receipt: z
    .any()
    .refine((files) => files?.length === 1, "Payment receipt (PDF) is required.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine((files) => files?.[0]?.type === "application/pdf", "Only .pdf format is supported."),
  screenshot: z
    .any()
    .optional()
    .refine((files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files[0].type),
      "Only .jpg, .jpeg, .png and .webp formats are supported."
    ),
});

type FormValues = z.infer<typeof schema>;

export interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSaved: () => void | Promise<void>;
}

export function PaymentModal({
  open,
  onOpenChange,
  userId,
  onSaved,
}: PaymentModalProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const { session, refresh } = useSession();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  useEffect(() => {
    if (!open) return;
    reset();
    setFormError(null);
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const formData = new FormData();
      formData.append("transactionId", values.transactionId);
      formData.append("receipt", values.receipt[0]);
      if (values.screenshot && values.screenshot.length > 0) {
        formData.append("screenshot", values.screenshot[0]);
      }

      await repo.payments.create(userId, formData);
      await refresh(); // Refresh session to get updated paymentStatus
      await onSaved();
      onOpenChange(false);
    } catch (e) {
      setFormError(
        e instanceof DataError ? e.message : "Could not upload payment details. Try again."
      );
    }
  });

  if (session?.paymentStatus === 'pending') {
    return (
      <BlockModal
        open={open}
        onOpenChange={onOpenChange}
        title="Payment Status"
        description="Your payment is under review."
      >
        <div className="py-[var(--mc-unit)] text-center">
          <p className="text-[18px] text-mc-text">
            We have received your payment submission. 
            Our team is currently verifying it. Once verified, your dashboard features will be unlocked.
          </p>
          <BlockButton
            block
            size="lg"
            variant="emerald"
            onClick={() => onOpenChange(false)}
            className="mt-[calc(var(--mc-unit)*2)]"
          >
            Got it
          </BlockButton>
        </div>
      </BlockModal>
    );
  }

  return (
    <BlockModal
      open={open}
      onOpenChange={onOpenChange}
      title="Submit Payment"
      description="Follow the steps below to complete your payment."
    >
      <div className="mb-[calc(var(--mc-unit)*3)] text-[12px] text-mc-text-dim font-pixel leading-relaxed">
        <h3 className="text-[14px] text-mc-text mb-[var(--mc-unit)] font-bold">Steps to Complete Payment</h3>
        <ol className="list-decimal list-outside ml-[calc(var(--mc-unit)*3.5)] space-y-[calc(var(--mc-unit)*0.75)]">
          <li>Visit the official Payment portal of Gateways 2026 at: <a href="https://eacademia.southindianbank.bank.in/ChristFee/" target="_blank" rel="noreferrer" className="text-mc-gold underline break-all">https://eacademia.southindianbank.bank.in/ChristFee/</a></li>
          <li>Select Fee Name as <strong className="text-mc-gold">"Events"</strong>.</li>
          <li>Select Category as <strong className="text-mc-gold">"Fest"</strong>.</li>
          <li>Select <strong className="text-mc-gold">Gateways - {'{'}Early Bird / Regular / On Spot / Internation / Christite (only for CHRIST University Students){'}'}</strong>.</li>
          <li>Complete the form with the same details you have used in the Profile Completion Form.</li>
          <li>Complete the payment.</li>
          <li>Enter Transaction ID from the generated Receipt of Payment.</li>
          <li>Upload Payment receipt (PDF Only) and Payment Screenshot.</li>
          <li>Submit the form and wait up to 24 hours to get the payment verified.</li>
        </ol>
        
        <BlockButton 
          type="button"
          variant="stone" 
          size="sm" 
          className="mt-[calc(var(--mc-unit)*2)] font-body" 
          onClick={() => window.open("https://youtu.be/dQw4w9WgXcQ", "_blank")}
        >
          <span className="inline-flex items-center">
            <Video className="w-4 h-4 mr-2" />
            Watch Video Tutorial
          </span>
        </BlockButton>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[calc(var(--mc-unit)*1.25)]">
        <BlockInput
          label="Transaction ID (From Receipt)"
          placeholder="Alphanumeric, max 30 chars"
          maxLength={30}
          required
          error={errors.transactionId?.message}
          {...register("transactionId")}
        />

        <div className="flex flex-col gap-[calc(var(--mc-unit)*0.25)]">
          <label className="font-pixel text-[10px] uppercase tracking-wide text-mc-text-dim">
            Upload Receipt (PDF Only)
            <span className="text-mc-danger" aria-hidden> *</span>
          </label>
          <p className="text-[12px] text-mc-text-dim/70 font-body mb-1">File should be less than 5MB.</p>
          <input
            type="file"
            accept="application/pdf"
            className="block w-full text-sm text-mc-text-dim file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-mc-panel-light file:text-mc-text hover:file:bg-mc-panel-light/80 cursor-pointer"
            {...register("receipt")}
          />
          {errors.receipt?.message && (
            <p className="text-[14px] text-mc-danger mt-1">{errors.receipt.message as string}</p>
          )}
        </div>

        <div className="flex flex-col gap-[calc(var(--mc-unit)*0.25)] pb-[var(--mc-unit)]">
          <label className="font-pixel text-[10px] uppercase tracking-wide text-mc-text-dim">
            Upload Screenshot (Optional, Image Only)
          </label>
          <p className="text-[12px] text-mc-text-dim/70 font-body mb-1">File should be less than 5MB.</p>
          <input
            type="file"
            accept="image/jpeg, image/jpg, image/png, image/webp"
            className="block w-full text-sm text-mc-text-dim file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-mc-panel-light file:text-mc-text hover:file:bg-mc-panel-light/80 cursor-pointer"
            {...register("screenshot")}
          />
          {errors.screenshot?.message && (
            <p className="text-[14px] text-mc-danger mt-1">{errors.screenshot.message as string}</p>
          )}
        </div>

        {formError ? (
          <BlockPanel
            variant="slot"
            padded="sm"
            role="alert"
            aria-live="assertive"
            className="border-mc-redstone text-mc-danger text-[19px]"
          >
            {formError}
          </BlockPanel>
        ) : null}

        <BlockButton
          type="submit"
          block
          size="lg"
          variant="emerald"
          loading={isSubmitting}
          className="mt-[var(--mc-unit)]"
        >
          Submit Payment
        </BlockButton>
      </form>
    </BlockModal>
  );
}
