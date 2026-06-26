import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

function scryptAsync(password: string, salt: Buffer, keyLength: number, options: { N: number; r: number; p: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    const scryptWithOptions = scryptCallback as unknown as (
      password: string,
      salt: Buffer,
      keyLength: number,
      options: { N: number; r: number; p: number },
      callback: (error: Error | null, derivedKey: Buffer) => void,
    ) => void;

    scryptWithOptions(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

export type PasswordHashResult = {
  hash: string;
  algorithm: "scrypt:v1";
};

export async function hashAccessPassword(password: string): Promise<PasswordHashResult> {
  const salt = randomBytes(16);
  const digest = await scryptAsync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return {
    algorithm: "scrypt:v1",
    hash: [
      "scrypt",
      "v1",
      String(SCRYPT_N),
      String(SCRYPT_R),
      String(SCRYPT_P),
      salt.toString("base64url"),
      digest.toString("base64url"),
    ].join(":"),
  };
}

export async function verifyAccessPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split(":");
    if (parts.length !== 7) {
      return false;
    }

    const [algorithm, version, n, r, p, saltBase64, digestBase64] = parts;

    if (algorithm !== "scrypt" || version !== "v1" || !saltBase64 || !digestBase64) {
      return false;
    }

    const cost = Number(n);
    const blockSize = Number(r);
    const parallelization = Number(p);

    if (
      !Number.isInteger(cost) ||
      !Number.isInteger(blockSize) ||
      !Number.isInteger(parallelization) ||
      cost <= 1 ||
      blockSize <= 0 ||
      parallelization <= 0
    ) {
      return false;
    }

    const expected = Buffer.from(digestBase64, "base64url");
    const actual = await scryptAsync(password, Buffer.from(saltBase64, "base64url"), expected.length, {
      N: cost,
      r: blockSize,
      p: parallelization,
    });

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
