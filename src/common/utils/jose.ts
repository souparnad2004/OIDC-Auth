import { importPKCS8, importSPKI } from "jose";
import fs from "node:fs/promises";

const privateKey = await importPKCS8(
  await fs.readFile("/etc/secrets/private-key.pem", "utf-8"),
  "RS256"
);

const publicKey = await importSPKI(
  await fs.readFile("/etc/secrets/public-key.pem", "utf-8"),
  "RS256"
);

export { privateKey, publicKey };