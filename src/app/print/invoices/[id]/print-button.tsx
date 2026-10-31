"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="shadow-md">
      <Printer className="size-4" /> Print or save as PDF
    </Button>
  );
}
