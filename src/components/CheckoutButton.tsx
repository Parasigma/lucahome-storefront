"use client";
import { useActionState } from "react";
import { startCheckoutAction, type OrderState } from "@/app/actions/orders";
import { SubmitButton } from "./SubmitButton";

export function CheckoutButton({ locale, label, errorText, orderId }: { locale: string; label: string; errorText: string; orderId?: string }) {
  const [state, action] = useActionState<OrderState, FormData>(startCheckoutAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      {orderId && <input type="hidden" name="orderId" value={orderId} />}
      {state.error && <p role="alert" className="alert-error">{errorText}</p>}
      <SubmitButton className="btn-brand w-full py-4 text-base">{label}</SubmitButton>
    </form>
  );
}
