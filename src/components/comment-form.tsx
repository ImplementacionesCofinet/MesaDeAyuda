"use client";

import { useActionState, useRef } from "react";
import { addComment, confirmDelivery, type ActionResult } from "@/lib/actions/tickets";
import { FormFeedback, SubmitButton } from "@/components/form";

export function CommentForm({ ticketId, esAgente }: { ticketId: string; esAgente: boolean }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(addComment, null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="ticketId" value={ticketId} />
      <FormFeedback state={state} />
      <textarea
        name="body"
        rows={4}
        required
        minLength={2}
        maxLength={4000}
        className="campo"
        placeholder="Escribe una actualización, una pregunta o la información que falta…"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {esAgente ? (
          <label className="flex items-center gap-2 text-sm text-humo">
            <input type="checkbox" name="internal" className="size-4 accent-[#B0562C]" />
            Nota interna (no la ve el área solicitante)
          </label>
        ) : (
          <span className="text-xs text-humo">Tu comentario le llega por correo al responsable.</span>
        )}
        <SubmitButton>Comentar</SubmitButton>
      </div>
    </form>
  );
}

/** Cierre por confirmación del solicitante, cuando el ticket ya está entregado. */
export function ConfirmDeliveryForm({ ticketId }: { ticketId: string }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(confirmDelivery, null);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <FormFeedback state={state} success="Gracias: el requerimiento quedó cerrado." />
      <textarea
        name="closingNote"
        rows={2}
        maxLength={1000}
        className="campo"
        placeholder="¿Algo que quieras dejar registrado del cierre? (opcional)"
      />
      <SubmitButton>Confirmar la entrega y cerrar</SubmitButton>
    </form>
  );
}
