const fs = require("fs");
const path = require("path");

const [action] = process.argv.slice(2);

const buildPath = path.join(__dirname, "contracts/fogata/build");
const abiPath = path.join(buildPath, "fogata-abi.json");
const abiCopyPath = path.join(buildPath, "fogata-abi.json-copy");
const abiPowerPath = path.join(buildPath, "fogata-abi-power.json");
if (action === "pre") {
  fs.copyFileSync(abiPath, abiCopyPath);
} else if (action === "post") {
  fs.copyFileSync(abiPath, abiPowerPath);
  fs.unlinkSync(abiCopyPath);
} else {
  throw new Error(`invalid action ${action}`);
}
