"use client";

import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/lib/actions/tickets";

export function SubmitButton({
  children,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
  const styles =
    variant === "primary"
      ? "bg-marca text-white hover:bg-[#1D3B37]"
      : "border border-borde bg-white text-tinta hover:bg-lienzo";

  return (
    <button type="submit" disabled={pending} className={`${base} ${styles} ${className}`}>
      {pending ? "Guardando…" : children}
    </button>
  );
}

/** Mensaje de resultado de una acción de servidor. */
export function FormFeedback({ state, success }: { state: ActionResult | null; success?: string }) {
  if (!state) return null;
  if (state.ok) {
    if (!success) return null;
    return (
      <p className="rounded-lg bg-[#E3EFE3] px-3 py-2 text-sm text-[#2E5C33]" role="status">
        {success}
      </p>
    );
  }
  return (
    <p className="rounded-lg bg-[#FBE7E1] px-3 py-2 text-sm text-[#96331A]" role="alert">
      {state.error}
    </p>
  );
}

export function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-tinta">
        {label}
        {required ? <span className="text-marca"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-humo">{hint}</span> : null}
    </label>
  );
}
