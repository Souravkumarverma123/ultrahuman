import { httpLink, httpBatchStreamLink } from "@repo/trpc/client";
import { env } from "~/env.js";

interface CreateTRPCHttpBatchClientClientOpts {
  enableStreaming?: boolean;
}

const TRPC_PATH = "/trpc";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isLocalHostname(hostname: string) {
  return LOCAL_HOSTS.has(hostname);
}

function withTRPCPath(url: string) {
  const trimmed = url.replace(/\/+$/, "");
  return trimmed.endsWith(TRPC_PATH) ? trimmed : `${trimmed}${TRPC_PATH}`;
}

function getTRPCUrl() {
  const apiUrl = env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    return TRPC_PATH;
  }

  if (typeof window !== "undefined" && isLocalHostname(window.location.hostname)) {
    try {
      const targetUrl = new URL(apiUrl, window.location.origin);
      if (!isLocalHostname(targetUrl.hostname)) {
        return TRPC_PATH;
      }
    } catch {
      return TRPC_PATH;
    }
  }

  return withTRPCPath(apiUrl);
}

export const createTRPCHttpBatchClientClient = (opts?: CreateTRPCHttpBatchClientClientOpts) => {
  const c = opts?.enableStreaming ? httpBatchStreamLink : httpLink;
  return c({
    url: getTRPCUrl(),
    fetch(url, options) {
      return fetch(url, {
        ...options,
        credentials: "include",
      });
    },
  });
};
