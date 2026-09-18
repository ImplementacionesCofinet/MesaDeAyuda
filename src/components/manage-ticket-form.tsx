"use client";

import { useActionState } from "react";
import type { Priority, TicketStatus } from "@prisma/client";
import { Field, FormFeedback, SubmitButton } from "@/components/form";
import { updateTicketManagement, type ActionResult } from "@/lib/actions/tickets";
import { allowedTransitions, PRIORITY_LABEL, PRIORITY_ORDER, STATUS_LABEL } from "@/lib/domain/status";

type Persona = { id: string; name: string };

/** Panel de gestión: solo lo ve el área de Datos y TI. */
export function ManageTicketForm({
  ticketId,
  status,
  priority,
  stage,
  pendingAction,
  pendingOwnerId,
  assigneeId,
  dueDateInput,
  equipo,
  personas,
}: {
  ticketId: string;
  status: TicketStatus;
  priority: Priority;
  stage: string | null;
  pendingAction: string | null;
  pendingOwnerId: string | null;
  assigneeId: string | null;
  dueDateInput: string;
  equipo: Persona[];
  personas: Persona[];
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(updateTicketManagement, null);
  const estados: TicketStatus[] = [status, ...allowedTransitions(status)];

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <FormFeedback state={state} success="Cambios guardados. El área ya ve la actualización." />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Estado">
          <select name="status" defaultValue={status} className="campo">
            {estados.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Prioridad">
          <select name="priority" defaultValue={priority} className="campo">
            {PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Etapa del proceso" hint="El punto exacto del flujo, en tus palabras.">
        <input
          name="stage"
          defaultValue={stage ?? ""}
          maxLength={160}
          className="campo"
          placeholder="Ej.: Validando el reporte con Contabilidad"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Qué falta" hint="La actividad pendiente concreta.">
          <input
            name="pendingAction"
            defaultValue={pendingAction ?? ""}
            maxLength={280}
            className="campo"
            placeholder="Ej.: Recibir el archivo de referencias"
          />
        </Field>

        <Field label="Depende de">
          <select name="pendingOwnerId" defaultValue={pendingOwnerId ?? ""} className="campo">
            <option value="">Nadie en particular</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Responsable">
          <select name="assigneeId" defaultValue={assigneeId ?? ""} className="campo">
            <option value="">Por asignar</option>
            {equipo.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Fecha estimada de cierre" hint="Es el compromiso que ve el área; cambiarla le avisa por correo.">
          <input type="datetime-local" name="dueDate" defaultValue={dueDateInput} className="campo" />
        </Field>
      </div>

      <Field label="Nota para el área" hint="Opcional. Se envía junto con el aviso de cambio de estado.">
        <textarea name="note" rows={3} maxLength={2000} className="campo" />
      </Field>

      <SubmitButton>Guardar y notificar</SubmitButton>
    </form>
  );
}
