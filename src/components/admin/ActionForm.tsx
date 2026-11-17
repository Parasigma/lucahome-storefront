"use client";
import { useActionState } from "react";
import type { AdminState } from "@/app/actions/admin";
import { SubmitButton } from "../SubmitButton";

type Props = {
  action: (s: AdminState, fd: FormData) => Promise<AdminState>;
  children?: React.ReactNode;
  submit: string;
  buttonClass?: string;
  confirm?: string;
  className?: string;
};

/** Formulario del panel: muestra el resultado de la acción y pide confirmación si es irreversible. */
export function ActionForm({ action, children, submit, buttonClass = "btn-primary", confirm, className = "space-y-4" }: Props) {
  const [state, formAction] = useActionState<AdminState, FormData>(action, {});
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state.error && <p role="alert" className="alert-error">{state.error}</p>}
      {state.ok && <p role="status" className="alert-ok">{state.ok}</p>}
      <SubmitButton className={buttonClass}>{submit}</SubmitButton>
    </form>
  );
}
