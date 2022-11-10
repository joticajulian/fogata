const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function humanFileSize(size) {
  const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

const [contract] = process.argv.slice(2);
const filePath = path.join(__dirname, "contracts", contract, "build/release/contract.wasm");
const data = fs.readFileSync(filePath);
const hash = crypto.createHash("sha256").update(data).digest("hex");

console.log(`
contract: ${contract}
file:     ${filePath}
size:     ${data.length} bytes (${humanFileSize(data.length)})
sha256:   ${hash}
`)