import { serviceGet } from "@/lib/services/baseService";

/**
 * Cifrado del password para el transporte (RSA PKCS#1 v1.5).
 *
 * DEFENSA EN PROFUNDIDAD **sobre TLS**, NO un reemplazo de TLS: evita que el password
 * viaje legible en el cuerpo (Network tab, logs de proxies intermedios). Se usa la clave
 * pública RSA del backend (`GET /security/public-key`, cacheada), y el backend lo descifra
 * en login/change-password/reset-password. En reposo el password sigue siendo BCrypt.
 *
 * Se usa JSEncrypt (JS puro, PKCS#1 v1.5) en vez de WebCrypto porque:
 *  - Coincide con el padding del backend (`RSA/ECB/PKCS1Padding`) → cero riesgo de interop.
 *  - `crypto.subtle` NO existe en contextos no-seguros (HTTP fuera de localhost); JSEncrypt sí.
 */

let cachedPublicKeyPem: string | null = null;

/** Envuelve la base64 SPKI (X.509) del backend en cabeceras PEM que JSEncrypt entiende. */
function toPem(base64Spki: string): string {
  const body =
    base64Spki
      .replace(/\s+/g, "")
      .match(/.{1,64}/g)
      ?.join("\n") ?? base64Spki;
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
}

async function getPublicKeyPem(): Promise<string> {
  if (cachedPublicKeyPem) return cachedPublicKeyPem;

  const res = await serviceGet<{ publicKey: string }>("/security/public-key");
  const base64 = res?.data?.publicKey;
  if (!base64) {
    throw new Error("No se pudo obtener la clave pública del servidor.");
  }

  cachedPublicKeyPem = toPem(base64);
  return cachedPublicKeyPem;
}

/**
 * Cifra el password con la clave pública RSA del backend y devuelve el ciphertext en base64.
 * Import dinámico de JSEncrypt para no arrastrarlo al bundle del servidor (usa APIs del navegador).
 */
export async function encryptPasswordForTransport(password: string): Promise<string> {
  const pem = await getPublicKeyPem();

  const { JSEncrypt } = await import("jsencrypt");
  const encryptor = new JSEncrypt();
  encryptor.setPublicKey(pem);

  const encrypted = encryptor.encrypt(password);
  if (!encrypted) {
    throw new Error("No se pudo cifrar la contraseña.");
  }
  return encrypted;
}
