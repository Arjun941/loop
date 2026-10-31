"use client";

import { Command } from "cmdk";
import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV, SECONDARY_NAV } from "./nav";

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("loop:command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("loop:command", onOpen);
    };
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[14vh]">
          <motion.div
            className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ type: "spring", stiffness: 520, damping: 36 }}
            className="relative w-full max-w-[560px] overflow-hidden rounded-2xl bg-surface shadow-lg"
          >
            <Command label="Command bar" loop>
              <Command.Input
                autoFocus
                placeholder="Search or jump to…"
                className="h-14 w-full border-b border-line bg-transparent px-5 text-[16px] outline-none placeholder:text-subtle"
              />
              <Command.List className="max-h-[360px] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-8 text-center text-sm text-muted">No results</Command.Empty>
                <Command.Group heading="Go to" className="text-xs text-subtle [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
                  {[...NAV, ...SECONDARY_NAV].map(({ href, label, icon: Icon }) => (
                    <Command.Item
                      key={href}
                      value={label}
                      onSelect={() => go(href)}
                      className="group flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-[14px] text-fg data-[selected=true]:bg-accent data-[selected=true]:text-accent-fg"
                    >
                      <Icon className="size-[17px] opacity-70" />
                      {label}
                      <ArrowRight className="ml-auto size-4 opacity-0 group-data-[selected=true]:opacity-80" />
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
