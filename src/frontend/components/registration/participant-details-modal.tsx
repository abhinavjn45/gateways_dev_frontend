"use client";

import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { BlockButton, BlockInput, BlockModal, BlockPanel, BlockSelect, BlockCombobox } from "@/frontend/components/mc";
import { repo } from "@/lib/data";
import { DataError, type Character, type ParticipantDetails, type Profile } from "@/lib/data/types";
import { useAsync } from "@/frontend/hooks/use-async";

/**
 * The participant details every registration needs.
 *
 * These participant fields are not a Gateways invention — they are the shape
 * `POST /v1/registrations` takes (BACKEND-API-CONTRACT.md §5), and the
 * registration console renders them directly in its intake table, drawers and
 * CSV exports. The option VALUES below must therefore stay exactly as they are;
 * only the labels are ours to phrase.
 *
 * Shown once. A `Profile` that already has these comes back pre-filled, so a
 * student entering their fourth event confirms rather than retypes — the
 * console models one Participant per person, matched on email, and asking for
 * the same nine answers per event invites them to disagree with each other.
 *
 * College, department and year live on the participant record as well as the
 * default character. They are collected here because the character builder is
 * no longer a separate step.
 */

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

const DIETS = [
  ["Vegeterian", "Vegeterian"],
  ["Non-Vegeterian", "Non-Vegeterian"],
] as const;

const phone = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{10}$/, `Enter a valid 10-digit ${label}.`);

const schema = z.object({
  fullName: z.string().trim().min(3, "At least 3 characters."),
  phone: phone("mobile number"),
  collegeId: z.string().trim().min(1, "Select your college."),
  departmentId: z.string().trim().min(1, "Select your department."),
  yearOfStudy: z.string().trim().regex(/^(1st|2nd|3rd|4th|5th|6th)$/, "Select your year."),
  gender: z.enum(["Male", "Female", "Other"]),
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please select a valid date.")
    .refine((v) => {
      const date = new Date(v);
      return date < new Date();
    }, "Date of birth must be in the past."),
  tshirtSize: z.enum(["XS", "S", "M", "L", "XL", "XXL"]),
  dietaryPref: z.enum(["Vegeterian", "Non-Vegeterian"]),
  emergencyName: z.string().trim().min(3, "Who should we call?"),
  emergencyPhone: phone("emergency number"),
});

type FormValues = z.infer<typeof schema>;

function defaultFormValues(profile: Profile | null, character: Character | null): FormValues {
  let dob = profile?.dateOfBirth ?? "";

  return {
    fullName: profile?.fullName ?? "",
    phone: profile?.phone ?? "",
    collegeId: profile?.collegeId ?? character?.collegeId ?? "",
    departmentId: profile?.departmentId ?? character?.departmentId ?? "",
    yearOfStudy: profile?.yearOfStudy ?? character?.yearOfStudy ?? "",
    gender: (profile?.gender as any) ?? "Male",
    dateOfBirth: dob,
    tshirtSize: profile?.tshirtSize ?? "M",
    dietaryPref: (profile?.dietaryPref as any) ?? "Vegeterian",
    emergencyName: profile?.emergencyName ?? "",
    emergencyPhone: profile?.emergencyPhone ?? "",
  };
}

export interface ParticipantDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  /** Existing values to pre-fill from; null on a first registration. */
  profile: Profile | null;
  /** Default character values are used to pre-fill institution fields. */
  character: Character | null;
  /** Fired after the details are saved, so the caller can register. */
  onSaved: (details: ParticipantDetails) => void | Promise<void>;
}

export function ParticipantDetailsModal({
  open,
  onOpenChange,
  userId,
  profile,
  character,
  onSaved,
}: ParticipantDetailsModalProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultFormValues(profile, character),
  });
  useEffect(() => {
    if (!open) return;
    reset(defaultFormValues(profile, character));
  }, [open, profile, character, reset]);
  const collegeId = useWatch({ control, name: "collegeId" });
  const { data: colleges } = useAsync(() => repo.reference.colleges(), [open]);
  const { data: departments } = useAsync(
    () => repo.reference.departments(collegeId || null),
    [collegeId, open],
  );

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const isoDob = values.dateOfBirth;

      await repo.profiles.update(userId, {
        ...values,
        dateOfBirth: isoDob,
        yearOfStudy: values.yearOfStudy,
      });
      await repo.characters.update(userId, {
        collegeId: values.collegeId,
        departmentId: values.departmentId,
        yearOfStudy: values.yearOfStudy,
      });
      // Saving and registering are two steps and the caller owns the second, so
      // a failed registration leaves the details saved rather than discarding
      // nine fields the student just typed.
      await onSaved({ ...values, dateOfBirth: isoDob, yearOfStudy: values.yearOfStudy });
      onOpenChange(false);
    } catch (e) {
      setFormError(
        e instanceof DataError ? e.message : "Could not save your details. Try again.",
      );
    }
  });

  return (
    <BlockModal
      open={open}
      onOpenChange={onOpenChange}
      title="Your details"
      description="Needed once. We reuse these for every event you enter."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[calc(var(--mc-unit)*0.25)]">
        <BlockInput
          label="Full name"
          placeholder="As it should appear on your badge"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        <BlockInput
          label="Mobile number"
          type="tel"
          inputMode="numeric"
          placeholder="9876543210"
          autoComplete="tel"
          maxLength={10}
          error={errors.phone?.message}
          {...register("phone", {
            onChange: (e) => {
              e.target.value = e.target.value.replace(/\D/g, "");
            },
          })}
        />

        <Controller
          control={control}
          name="collegeId"
          render={({ field: { onChange, value } }) => (
            <BlockCombobox
              label="College"
              placeholder="Search your college..."
              error={errors.collegeId?.message}
              options={(colleges ?? []).map(c => ({ id: c.id, name: c.name }))}
              value={value}
              onChange={onChange}
            />
          )}
        />

        <BlockSelect
          label="Department"
          error={errors.departmentId?.message}
          {...register("departmentId")}
        >
          <option value="">Select your department…</option>
          {(departments ?? []).map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </BlockSelect>

        <BlockSelect label="Year of study" error={errors.yearOfStudy?.message} {...register("yearOfStudy")}>
          <option value="">Select your year…</option>
          {["1st", "2nd", "3rd", "4th", "5th", "6th"].map((year) => (
            <option key={year} value={year}>
              {year} Year
            </option>
          ))}
        </BlockSelect>

        <BlockInput
          label="Date of birth"
          type="date"
          placeholder="YYYY-MM-DD"
          autoComplete="bday"
          hint="Participants under 18 need guardian consent at the desk."
          error={errors.dateOfBirth?.message}
          wrapperClassName="mb-[calc(var(--mc-unit)*0.75)]"
          {...register("dateOfBirth")}
        />

        <BlockSelect label="Gender" error={errors.gender?.message} {...register("gender")}>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </BlockSelect>

        <BlockSelect label="T-shirt size (Polo T-shirt)" error={errors.tshirtSize?.message} {...register("tshirtSize")}>
          {TSHIRT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </BlockSelect>

        <BlockSelect label="Food preference" error={errors.dietaryPref?.message} {...register("dietaryPref")}>
          {DIETS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </BlockSelect>

        <BlockInput
          label="Emergency contact name"
          placeholder="Parent or guardian"
          error={errors.emergencyName?.message}
          {...register("emergencyName")}
        />

        <BlockInput
          label="Emergency contact number"
          type="tel"
          inputMode="numeric"
          placeholder="9876543210"
          maxLength={10}
          error={errors.emergencyPhone?.message}
          {...register("emergencyPhone", {
            onChange: (e) => {
              e.target.value = e.target.value.replace(/\D/g, "");
            },
          })}
        />

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
          Save Profile
        </BlockButton>
      </form>
    </BlockModal>
  );
}
