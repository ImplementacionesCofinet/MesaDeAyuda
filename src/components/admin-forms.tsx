"use client";

import { useActionState } from "react";
import type { Priority, Role } from "@prisma/client";
import { FormFeedback, SubmitButton } from "@/components/form";
import { saveArea, saveCategory, saveSla, saveUser } from "@/lib/actions/admin";
import type { ActionResult } from "@/lib/actions/tickets";
import { PRIORITY_CRITERION, PRIORITY_LABEL } from "@/lib/domain/status";
import { ROLE_LABEL } from "@/lib/domain/permissions";

export function AreaForm({ area }: { area?: { id: string; name: string; active: boolean } }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveArea, null);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      {area ? <input type="hidden" name="id" value={area.id} /> : null}
      <input
        name="name"
        defaultValue={area?.name ?? ""}
        placeholder="Nombre del área"
        required
        className="campo max-w-xs flex-1"
      />
      {area ? (
        <label className="flex items-center gap-2 text-sm text-humo">
          <input type="checkbox" name="active" value="true" defaultChecked={area.active} className="size-4 accent-[#B0562C]" />
          Activa
        </label>
      ) : null}
      <SubmitButton variant={area ? "secondary" : "primary"}>{area ? "Guardar" : "Agregar área"}</SubmitButton>
      <FormFeedback state={state} />
    </form>
  );
}

export function CategoryForm({
  category,
}: {
  category?: { id: string; name: string; description: string | null; active: boolean };
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveCategory, null);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <input
        name="name"
        defaultValue={category?.name ?? ""}
        placeholder="Nombre de la categoría"
        required
        className="campo max-w-xs flex-1"
      />
      <input
        name="description"
        defaultValue={category?.description ?? ""}
        placeholder="Qué entra en esta categoría"
        className="campo max-w-sm flex-1"
      />
      {category ? (
        <label className="flex items-center gap-2 text-sm text-humo">
          <input type="checkbox" name="active" value="true" defaultChecked={category.active} className="size-4 accent-[#B0562C]" />
          Activa
        </label>
      ) : null}
      <SubmitButton variant={category ? "secondary" : "primary"}>
        {category ? "Guardar" : "Agregar categoría"}
      </SubmitButton>
      <FormFeedback state={state} />
    </form>
  );
}

export function UserRow({
  user,
  areas,
}: {
  user: { id: string; name: string; email: string; role: Role; areaId: string | null; active: boolean };
  areas: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveUser, null);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2 border-b border-borde/70 py-3 last:border-0">
      <input type="hidden" name="id" value={user.id} />
      <div className="min-w-48 flex-1">
        <div className="text-sm font-semibold text-tinta">{user.name}</div>
        <div className="text-xs text-humo">{user.email}</div>
      </div>
      <select name="role" defaultValue={user.role} className="campo max-w-40">
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
      <select name="areaId" defaultValue={user.areaId ?? ""} className="campo max-w-48">
        <option value="">Sin área</option>
        {areas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm text-humo">
        <input type="checkbox" name="active" value="true" defaultChecked={user.active} className="size-4 accent-[#B0562C]" />
        Activo
      </label>
      <SubmitButton variant="secondary">Guardar</SubmitButton>
      <FormFeedback state={state} />
    </form>
  );
}

export function SlaRow({
  policy,
}: {
  policy: { priority: Priority; responseHours: number | null; resolutionHours: number | null; agreed: boolean };
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveSla, null);

  return (
    <form action={action} className="border-b border-borde/70 py-4 last:border-0">
      <input type="hidden" name="priority" value={policy.priority} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <div className="text-sm font-semibold text-terracota">{PRIORITY_LABEL[policy.priority]}</div>
          <div className="text-xs leading-snug text-humo">{PRIORITY_CRITERION[policy.priority]}</div>
        </div>
        <label className="text-xs text-humo">
          Primera respuesta (h)
          <input
            type="number"
            name="responseHours"
            min={0}
            defaultValue={policy.responseHours ?? ""}
            className="campo mt-1 w-28"
          />
        </label>
        <label className="text-xs text-humo">
          Solución (h hábiles)
          <input
            type="number"
            name="resolutionHours"
            min={0}
            defaultValue={policy.resolutionHours ?? ""}
            className="campo mt-1 w-32"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-humo">
          <input type="checkbox" name="agreed" defaultChecked={policy.agreed} className="size-4 accent-[#B0562C]" />
          Acordado con las áreas
        </label>
        <SubmitButton variant="secondary">Guardar</SubmitButton>
      </div>
      <div className="mt-2">
        <FormFeedback state={state} success="Acuerdo actualizado." />
      </div>
    </form>
  );
}
