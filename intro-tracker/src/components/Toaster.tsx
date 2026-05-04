"use client";

import dynamic from "next/dynamic";

const SonnerToaster = dynamic(
  () => import("sonner").then((m) => m.Toaster),
  { ssr: false },
);

export default function Toaster() {
  return <SonnerToaster position="top-right" richColors closeButton />;
}
