import type { ReactNode } from "react";

export default function Disclosure({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return <details className="scientific-disclosure" open={open}>
    <summary>{title}</summary>
    <div>{children}</div>
  </details>;
}
