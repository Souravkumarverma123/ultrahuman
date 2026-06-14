import type { Metadata } from "next";
import { LandingContent } from "./landing-content";

export const metadata: Metadata = {
  title: "Ultrahuman | AI Email and Calendar Workspace",
  description:
    "Ultrahuman is a Corsair-powered command center for Gmail, Google Calendar, and agent workflows across email, search, invites, and scheduling.",
  openGraph: {
    title: "Ultrahuman | AI Email and Calendar Workspace",
    description:
      "A Corsair-powered command center for Gmail, Google Calendar, and agent workflows Google never made obvious.",
    type: "website",
  },
};

export default function Home() {
  return <LandingContent />;
}
