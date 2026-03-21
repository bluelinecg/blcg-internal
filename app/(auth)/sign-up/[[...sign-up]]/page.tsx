// [[...sign-up]] is an optional catch-all route required by Clerk.
// See sign-in/[[...sign-in]]/page.tsx for full explanation.
import { SignUp } from "@clerk/nextjs";

export function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <SignUp />
    </main>
  );
}

export default SignUpPage;
