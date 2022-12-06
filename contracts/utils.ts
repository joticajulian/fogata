import crypto from "crypto";
const fs = require("fs");
const path = require("path");

export function humanFileSize(size: number) {
  const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (
    (size / Math.pow(1024, i)).toFixed(2) +
    " " +
    ["B", "kB", "MB", "GB", "TB"][i]
  );
}

export function contractDetails(data: Uint8Array) {
  const sha256 = crypto.createHash("sha256").update(data).digest("hex");
  const size = `${data.length} bytes (${humanFileSize(data.length)})`;
  return { size, sha256 };
}
