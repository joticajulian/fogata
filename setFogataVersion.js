const fs = require("fs");
const path = require("path");
const { version } = require("./package.json");

const filePath = path.join(__dirname, "contracts/fogata/assembly/constants.ts");
const data = fs.readFileSync(filePath, "utf8");

const dataUpdated = data
  .split("\n")
  .map((line) => {
    if (!line.startsWith("export const fogataVersion")) return line;
    return `export const fogataVersion = "${version}";`;
  })
  .join("\n");

fs.writeFileSync(filePath, dataUpdated);
