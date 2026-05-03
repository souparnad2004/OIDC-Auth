import { importPKCS8, importSPKI } from "jose";
import fs from "node:fs/promises";
import path from "path";

const privateKey = await importPKCS8(
  await fs.readFile(path.join(process.cwd(), "keys/private-key.pem"), "utf-8"),
  "RS256"
);

const publicKey = await importSPKI(
  await fs.readFile(path.join(process.cwd(), "keys/public-key.pem"), "utf-8"),
  "RS256"
);

export { privateKey, publicKey };