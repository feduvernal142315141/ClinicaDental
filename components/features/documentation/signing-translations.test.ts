import { describe, expect, it } from "vitest";
import { translations } from "@/lib/i18n/translations";

describe("remote signature labels", () => {
  for (const [language, messages] of Object.entries(translations)) {
    it("provides visible signing and waiting labels in " + language, () => {
      for (const key of ["documentation.remoteSignAndSend", "documentation.useSignature", "documentation.remoteWaiting", "documentation.remoteWaitingHint", "documentation.remoteChecking"] as const) {
        expect(messages[key]?.trim(), key).toBeTruthy();
      }
    });
  }
});
