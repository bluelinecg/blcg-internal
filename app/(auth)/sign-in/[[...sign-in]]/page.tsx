// [[...sign-in]] is an optional catch-all route required by Clerk.
// The SignIn component navigates to sub-paths internally (e.g. /sign-in/factor-one,
// /sign-in/sso-callback). The optional catch-all matches both the base /sign-in
// path and all Clerk sub-paths, preventing 404s during the auth flow.
import { SignIn } from "@clerk/nextjs";

export function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <SignIn />
    </main>
  );
}

export default SignInPage;
