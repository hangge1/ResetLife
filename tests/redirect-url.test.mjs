import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createRedirectUrl,
  createRedirectUrlFromRefererPath,
} from "../features/access/services/redirect-url.ts";

test("redirect URL ignores 0.0.0.0 request host and uses forwarded public host", () => {
  const request = new Request("http://0.0.0.0:3000/access/logout", {
    headers: {
      host: "0.0.0.0:3000",
      "x-host": "www.hangge.xyz:443",
      "x-scheme": "https",
    },
  });

  assert.equal(createRedirectUrl(request, "/access/verify").toString(), "https://www.hangge.xyz/access/verify");
});

test("redirect URL keeps a safe referer origin before forwarded headers", () => {
  const request = new Request("http://0.0.0.0:3000/access/logout", {
    headers: {
      referer: "https://www.hangge.xyz/settings",
      "x-host": "127.0.0.1:3000",
      "x-scheme": "http",
    },
  });

  assert.equal(createRedirectUrl(request, "/access/verify").toString(), "https://www.hangge.xyz/access/verify");
});

test("home redirect strips the access marker from a safe referer path", () => {
  const request = new Request("http://0.0.0.0:3000/access/verify/submit", {
    headers: {
      referer: "https://www.hangge.xyz/access/verify",
    },
  });

  assert.equal(createRedirectUrlFromRefererPath(request, "/access/verify", "/").toString(), "https://www.hangge.xyz/");
});
