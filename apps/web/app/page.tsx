import type { Metadata } from "next";
import { LandingContent } from "./landing-content";

export const metadata: Metadata = {
  title: "AI Email Assistant for Gmail & Google Calendar | Ultrahuman",
  description:
    "Automate Gmail and Google Calendar with AI. Draft emails, schedule meetings, create Google Meet links, manage invitations, and streamline daily workflows from a single AI-powered workspace.",
  openGraph: {
    title: "AI Email Assistant for Gmail & Google Calendar | Ultrahuman",
    description:
      "Automate email, scheduling, and calendar workflows with AI. Connect Gmail and Google Calendar to draft emails, create events, send invites, and manage work faster.",
    type: "website",
  },
};

export default function Home() {
  return <LandingContent />;
}
