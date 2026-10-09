import { Suspense } from "react";
import App from "@/components/app";
export default function Page() {
  return (
    <Suspense fallback={<div className="loading">Loading…</div>}>
      <App />
    </Suspense>
  );
}
