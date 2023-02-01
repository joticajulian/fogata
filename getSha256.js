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
const filePathPowerMainnet = path.join(__dirname, "build/fogata-power.wasm");
const filePathPowerHarbinger = path.join(
  __dirname,
  "build/fogata-power-harbinger.wasm"
);
const dataMainnet = fs.readFileSync(filePathMainnet);
const dataHarbinger = fs.readFileSync(filePathHarbinger);
const dataPowerMainnet = fs.readFileSync(filePathPowerMainnet);
const dataPowerHarbinger = fs.readFileSync(filePathPowerHarbinger);
const hashMainnet = crypto
  .createHash("sha256")
  .update(dataMainnet)
  .digest("hex");
const hashHarbinger = crypto
  .createHash("sha256")
  .update(dataHarbinger)
  .digest("hex");
const hashPowerMainnet = crypto
  .createHash("sha256")
  .update(dataPowerMainnet)
  .digest("hex");
const hashPowerHarbinger = crypto
  .createHash("sha256")
  .update(dataPowerHarbinger)
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
  mainnetPower: {
    file: filePathPowerMainnet,
    size: `${dataPowerMainnet.length} bytes (${humanFileSize(
      dataPowerMainnet.length
    )})`,
    sha256: hashPowerMainnet,
  },
  harbingerPower: {
    file: filePathPowerHarbinger,
    size: `${dataPowerHarbinger.length} bytes (${humanFileSize(
      dataPowerHarbinger.length
    )})`,
    sha256: hashPowerHarbinger,
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
size (mainnet-power) | ${info.mainnetPower.size}
sha256 (mainnet-power) | ${info.mainnetPower.sha256}
size (harbinger-power) | ${info.harbingerPower.size}
sha256 (harbinger-power) | ${info.harbingerPower.sha256}

### 🚀 Features

-

### 🐛 Bug Fixes

-

${readmeData}`;
fs.writeFileSync(readmePath, readmeData);
