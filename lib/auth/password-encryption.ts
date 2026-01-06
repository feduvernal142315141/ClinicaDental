export type PasswordEncryptionStrategy = "sha256-base64" | "sha256-hex";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }

  return Buffer.from(bytes).toString("base64");
}

async function sha256Bytes(input: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("WebCrypto is not available to encrypt password");
  }

  const hashBuffer = await subtle.digest("SHA-256", data);
  return new Uint8Array(hashBuffer);
}

/**
 * Encrypts (hashes) a password for transport.
 *
 * NOTE: This is a one-way transform (hash). The backend must expect it.
 */
export async function encryptPasswordForTransport(
  password: string,
  strategy: PasswordEncryptionStrategy = "sha256-base64"
): Promise<string> {
  const bytes = await sha256Bytes(password);

  switch (strategy) {
    case "sha256-hex":
      return toHex(bytes);
    case "sha256-base64":
    default:
      return toBase64(bytes);
  }
}
