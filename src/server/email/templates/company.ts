/**
 * The sending company's name for email templates. `sendEmail` sets it from company settings for the
 * duration of a render (AsyncLocalStorage, since React context isn't available on the server),
 * so individual templates never hard-code a brand.
 */
import { AsyncLocalStorage } from "node:async_hooks";

const store = new AsyncLocalStorage<string>();

export function withCompany<T>(name: string, fn: () => Promise<T>) {
  return store.run(name, fn);
}

export function emailCompany() {
  return store.getStore() ?? "Loop";
}
