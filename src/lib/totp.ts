import { createHmac, timingSafeEqual } from "crypto";

// RFC 6238 TOTP implementation using Node's built-in crypto — no extra dependencies

function hotp(secret: Buffer, counter: number): number {
  const msg = Buffer.alloc(8);
  // Write counter as big-endian 64-bit
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const hmac  = createHmac("sha1", secret).update(msg).digest();
  const offset = hmac[19] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) |
               ((hmac[offset + 1] & 0xff) << 16) |
               ((hmac[offset + 2] & 0xff) << 8) |
               (hmac[offset + 3] & 0xff);
  return code % 1_000_000;
}

function base32Decode(str: string): Buffer {
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = str.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const idx = CHARS.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  const bytes = Buffer.from(Array.from({ length: 20 }, () => Math.floor(Math.random() * 256)));
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let result = "";
  for (let i = 0; i < bytes.length; i += 5) {
    const b0 = bytes[i],      b1 = bytes[i+1] ?? 0, b2 = bytes[i+2] ?? 0;
    const b3 = bytes[i+3] ?? 0, b4 = bytes[i+4] ?? 0;
    result += CHARS[(b0 >> 3) & 31];
    result += CHARS[((b0 << 2) | (b1 >> 6)) & 31];
    result += CHARS[(b1 >> 1) & 31];
    result += CHARS[((b1 << 4) | (b2 >> 4)) & 31];
    result += CHARS[((b2 << 1) | (b3 >> 7)) & 31];
    result += CHARS[(b3 >> 2) & 31];
    result += CHARS[((b3 << 3) | (b4 >> 5)) & 31];
    result += CHARS[b4 & 31];
  }
  return result;
}

export function verifyTotp(secret: string, token: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  const tokenNum = parseInt(token, 10);
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / 30);

  // Accept ±1 window (90 second tolerance)
  for (const delta of [-1, 0, 1]) {
    const expected = hotp(key, counter + delta);
    const expStr = String(expected).padStart(6, "0");
    try {
      if (timingSafeEqual(Buffer.from(String(tokenNum).padStart(6, "0")), Buffer.from(expStr))) {
        return true;
      }
    } catch { /* length mismatch */ }
  }
  return false;
}

export function getTotpUri(secret: string, account: string, issuer = "Prime Broker Admin"): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
