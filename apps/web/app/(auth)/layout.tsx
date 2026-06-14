import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Ultrahuman",
  description: "Sign in to your Ultrahuman account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
