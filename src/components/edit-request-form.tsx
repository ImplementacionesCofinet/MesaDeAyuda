"use client";

import { useActionState } from "react";
import { Field, FormFeedback, SubmitButton } from "@/components/form";
import { updateTicketRequest, type ActionResult } from "@/lib/actions/tickets";

/** Corrección del contenido de la solicitud, antes de que entre en gestión. */
export function EditRequestForm({
  ticketId,
  title,
  description,
  categoryId,
  categorias,
}: {
  ticketId: string;
  title: string;
  description: string;
  categoryId: string;
  categorias: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(updateTicketRequest, null);

  return (
    <details className="tarjeta p-5">
      <summary className="cursor-pointer text-sm font-semibold text-marca">Corregir la solicitud</summary>
      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="ticketId" value={ticketId} />
        <FormFeedback state={state} success="Solicitud actualizada." />

        <Field label="Asunto" required>
          <input name="title" defaultValue={title} required minLength={8} maxLength={160} className="campo" />
        </Field>

        <Field label="Descripción" required>
          <textarea name="description" defaultValue={description} required minLength={20} rows={6} className="campo" />
        </Field>

        <Field label="Categoría" required>
          <select name="categoryId" defaultValue={categoryId} className="campo">
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <SubmitButton variant="secondary">Guardar cambios</SubmitButton>
      </form>
    </details>
  );
}
