// Root page — redirects immediately to /dashboard.
// Unauthenticated users will be caught by Clerk middleware and sent to /sign-in.
import { redirect } from "next/navigation";

export function RootPage() {
  redirect("/dashboard");
}

export default RootPage;
