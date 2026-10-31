"use client";

import { number } from "@/lib/format";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useList } from "./list-state";

export function Pagination({ page, total, pageSize, noun }: { page: number; total: number; pageSize: number; noun: string }) {
  const { setParams } = useList();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[13px] text-muted">
      <span className="tabular">
        {number(from)}–{number(to)} of {number(total)} {noun}
      </span>
      <div className="flex items-center gap-1">
        <PageButton disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })} label="Previous page">
          <ChevronLeft className="size-4" />
        </PageButton>
        <span className="tabular px-2">
          {page} / {pages}
        </span>
        <PageButton disabled={page >= pages} onClick={() => setParams({ page: String(page + 1) })} label="Next page">
          <ChevronRight className="size-4" />
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({ children, disabled, onClick, label }: { children: React.ReactNode; disabled: boolean; onClick: () => void; label: string }) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg text-fg transition-colors hover:bg-hover disabled:opacity-30"
    >
      {children}
    </button>
  );
}
