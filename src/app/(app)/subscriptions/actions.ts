"use server";
/**
 * Subscription actions for staff and admins: save a draft, move through the lifecycle,
 * find or create a customer from the form.
 */
import type { SubscriptionAction } from "@/lib/domain/subscription-status";
import { fieldErrors, type FormState } from "@/lib/validation/auth";
import { customerSchema, subscriptionSchema } from "@/lib/validation/subscription";
import { requireStaff } from "@/server/auth/access";
import { db } from "@/server/db";
import { customers } from "@/server/db/schema";
import { searchCustomers } from "@/server/queries/subscriptions";
import { runSubscriptionAction, saveSubscription, sendQuotation, SubscriptionError } from "@/server/services/subscriptions";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function refresh(id?: string) {
  revalidatePath("/subscriptions");
  if (id) revalidatePath(`/subscriptions/${id}`);
  revalidatePath("/dashboard");
}

/** Saves the form. `intent=quote` also sends the quotation right away. */
export async function saveSubscriptionAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireStaff();
  const parsed = subscriptionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  let id: string;
  try {
    const saved = await saveSubscription(parsed.data, user.id);
    id = saved.id;
    if (form.get("intent") === "quote") {
      // A draft becomes a quotation; an existing quotation gets the updated quote re-sent.
      if (saved.status === "draft") await runSubscriptionAction(id, "send_quote", user.id);
      else await sendQuotation(id);
    }
  } catch (err) {
    if (err instanceof SubscriptionError) return err.field ? { fieldErrors: { [err.field]: err.message } } : { error: err.message };
    throw err;
  }
  refresh(id);
  redirect(`/subscriptions/${id}`);
}

export async function subscriptionAction(id: string, action: SubscriptionAction): Promise<FormState> {
  const user = await requireStaff();
  try {
    await runSubscriptionAction(id, action, user.id);
  } catch (err) {
    if (err instanceof SubscriptionError) return { error: err.message };
    throw err;
  }
  refresh(id);
  return { ok: true };
}

export async function findCustomers(q: string) {
  return searchCustomers(q);
}

export async function createCustomer(input: { name: string; email: string }): Promise<FormState & { customer?: { id: string; name: string; email: string } }> {
  await requireStaff();
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const [existing] = await db.select({ id: customers.id }).from(customers).where(sql`lower(${customers.email}) = ${parsed.data.email}`).limit(1);
  if (existing) return { fieldErrors: { email: "A customer with this email already exists" } };
  const [customer] = await db.insert(customers).values({ ...parsed.data, company: parsed.data.name }).returning({ id: customers.id, name: customers.name, email: customers.email });
  revalidatePath("/customers");
  return { ok: true, customer };
}
