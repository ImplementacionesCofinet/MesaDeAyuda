"use client";

import { useActionState, useState } from "react";
import { createTicket, type ActionResult } from "@/lib/actions/tickets";
import { Field, FormFeedback, SubmitButton } from "@/components/form";
import { PRIORITY_CRITERION, PRIORITY_LABEL, PRIORITY_ORDER } from "@/lib/domain/status";

type Option = { id: string; name: string; description?: string | null };

export function NewTicketForm({
  categorias,
  areas,
  equipo,
  esAgente,
  areaPropia,
}: {
  categorias: Option[];
  areas: Option[];
  equipo: Option[];
  esAgente: boolean;
  areaPropia: string | null;
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(createTicket, null);
  const [origen, setOrigen] = useState<"AREA" | "INTERNO">("AREA");
  const [prioridad, setPrioridad] = useState<"ALTA" | "MEDIA" | "BAJA">("MEDIA");

  return (
    <form action={action} className="space-y-5">
      <FormFeedback state={state} />

      {esAgente ? (
        <fieldset>
          <legend className="mb-1.5 block text-sm font-semibold text-tinta">Origen</legend>
          <div className="flex flex-wrap gap-2">
            {(["AREA", "INTERNO"] as const).map((valor) => (
              <label
                key={valor}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
                  origen === valor
                    ? "border-marca bg-marca-suave font-semibold text-marca"
                    : "border-borde bg-white text-humo hover:text-tinta"
                }`}
              >
                <input
                  type="radio"
                  name="origen"
                  value={valor}
                  checked={origen === valor}
                  onChange={() => setOrigen(valor)}
                  className="sr-only"
                />
                {valor === "AREA" ? "Requerimiento de un área" : "Iniciativa de Datos y TI"}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-humo">
            Las iniciativas propias se cargan en el mismo tablero para que la carga real del área sea visible al priorizar.
          </p>
        </fieldset>
      ) : (
        <input type="hidden" name="origen" value="AREA" />
      )}

      <Field label="Asunto" required hint="Una línea que resuma qué necesitas.">
        <input
          name="title"
          required
          minLength={8}
          maxLength={160}
          className="campo"
          placeholder="Ej.: Error al generar el informe de despachos en OASIS"
        />
      </Field>

      <Field
        label="Descripción"
        required
        hint="Qué pasa, desde cuándo, a quién afecta y qué esperas obtener. Entre más contexto, menos idas y vueltas."
      >
        <textarea name="description" required minLength={20} rows={7} className="campo" />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Categoría" required>
          <select name="categoryId" required className="campo" defaultValue="">
            <option value="" disabled>
              Selecciona…
            </option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        {esAgente ? (
          <Field label="Área solicitante" required>
            <select name="areaId" required className="campo" defaultValue={areaPropia ?? ""}>
              <option value="" disabled>
                Selecciona…
              </option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </div>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-semibold text-tinta">
          Prioridad<span className="text-marca"> *</span>
        </legend>
        <div className="grid gap-2 md:grid-cols-3">
          {PRIORITY_ORDER.map((p) => (
            <label
              key={p}
              className={`cursor-pointer rounded-lg border p-3 text-sm transition ${
                prioridad === p
                  ? "border-marca bg-marca-suave"
                  : "border-borde bg-white hover:border-marca/40"
              }`}
            >
              <input
                type="radio"
                name="priority"
                value={p}
                checked={prioridad === p}
                onChange={() => setPrioridad(p)}
                className="sr-only"
              />
              <span className={`block font-semibold ${prioridad === p ? "text-marca" : "text-tinta"}`}>
                {PRIORITY_LABEL[p]}
              </span>
              <span className="mt-1 block text-xs leading-snug text-humo">{PRIORITY_CRITERION[p]}</span>
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-humo">
          Datos y TI puede ajustar la prioridad al revisar el requerimiento; el cambio queda en el historial.
        </p>
      </fieldset>

      {esAgente && equipo.length > 0 ? (
        <Field label="Responsable inicial" hint="Opcional. Se puede asignar después desde el tablero.">
          <select name="assigneeId" className="campo" defaultValue="">
            <option value="">Por asignar</option>
            {equipo.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton>Registrar requerimiento</SubmitButton>
        <span className="text-xs text-humo">Recibirás un correo con el código del ticket.</span>
      </div>
    </form>
  );
}
