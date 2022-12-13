const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { version } = require("./package.json");

function humanFileSize(size) {
  const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (
    (size / Math.pow(1024, i)).toFixed(2) * 1 +
    " " +
    ["B", "kB", "MB", "GB", "TB"][i]
  );
}

const filePath = path.join(
  __dirname,
  "build/fogata.wasm"
);
const data = fs.readFileSync(filePath);
const hash = crypto.createHash("sha256").update(data).digest("hex");

const info = {
contract: `fogata v${version}`,
file: filePath,
size: `${data.length} bytes (${humanFileSize(data.length)})`,
sha256: hash,
};

console.log(info);
fs.writeFileSync(path.join(__dirname, "build/README.md"), `### Fogata v${version}

property | value
--- | ---
size | ${info.size}
sha256 | ${info.sha256}`);
