import fs from "node:fs/promises";

const privateKey = await fs.readFile(
  "/etc/secrets/private-key.pem",
  "utf-8"
);

const publicKey = await fs.readFile(
  "/etc/secrets/public-key.pem",
  "utf-8"
);

export {privateKey, publicKey}