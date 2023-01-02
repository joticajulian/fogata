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

const filePathMainnet = path.join(__dirname, "build/fogata.wasm");
const filePathHarbinger = path.join(__dirname, "build/fogata-harbinger.wasm");
const dataMainnet = fs.readFileSync(filePathMainnet);
const dataHarbinger = fs.readFileSync(filePathHarbinger);
const hashMainnet = crypto
  .createHash("sha256")
  .update(dataMainnet)
  .digest("hex");
const hashHarbinger = crypto
  .createHash("sha256")
  .update(dataHarbinger)
  .digest("hex");

const info = {
  contract: `fogata v${version}`,
  mainnet: {
    file: filePathMainnet,
    size: `${dataMainnet.length} bytes (${humanFileSize(dataMainnet.length)})`,
    sha256: hashMainnet,
  },
  harbinger: {
    file: filePathHarbinger,
    size: `${dataHarbinger.length} bytes (${humanFileSize(
      dataHarbinger.length
    )})`,
    sha256: hashHarbinger,
  },
};

console.log(info);
const readmePath = path.join(__dirname, "build/README.md");
let readmeData = fs.readFileSync(readmePath, "utf8");
readmeData = `## [Fogata v${version}](https://github.com/joticajulian/fogata/releases/tag/v${version}) (${new Date()
  .toISOString()
  .slice(0, 10)})

property | value
--- | ---
size (mainnet) | ${info.mainnet.size}
sha256 (mainnet) | ${info.mainnet.sha256}
size (harbinger) | ${info.harbinger.size}
sha256 (harbinger) | ${info.harbinger.sha256}

### 🚀 Features

-

### 🐛 Bug Fixes

-

${readmeData}`;
fs.writeFileSync(readmePath, readmeData);
