// Hello world skeleton — proves the full auth pipeline end-to-end:
// sign in → protected route → server-side user data → sign out.
// Replace with real dashboard content in a future phase.
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";

export async function DashboardPage() {
  const { userId } = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold text-gray-900">BLCG Internal Admin</h1>
      <p className="text-lg text-gray-600">
        Signed in as:{" "}
        <span className="font-mono text-gray-800">{userId}</span>
      </p>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Account:</span>
        <UserButton />
      </div>
    </main>
  );
}

export default DashboardPage;
