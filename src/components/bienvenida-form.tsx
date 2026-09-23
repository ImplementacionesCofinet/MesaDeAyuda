"use client";

import { useActionState } from "react";
import { elegirArea } from "@/lib/actions/perfil";
import type { ActionResult } from "@/lib/actions/tickets";
import { FormFeedback, SubmitButton } from "@/components/form";

export function BienvenidaForm({ areas }: { areas: { id: string; name: string }[] }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(elegirArea, null);

  return (
    <form action={action} className="space-y-4">
      <FormFeedback state={state} />

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-tinta">¿En qué área trabajas?</span>
        <select name="areaId" required defaultValue="" className="campo">
          <option value="" disabled>
            Selecciona tu área…
          </option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      <p className="text-xs leading-relaxed text-humo">
        Tu área define qué requerimientos ves: los tuyos y los de tus compañeros de área. Se elige una sola vez; si más
        adelante cambias de área, el traslado lo hace Datos y TI.
      </p>

      <SubmitButton>Entrar a la mesa de ayuda</SubmitButton>
    </form>
  );
}
