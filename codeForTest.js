const fs = require("fs");
const path = require("path");

const [inputCodeForTest] = process.argv.slice(2);

if (!["true", "false"].includes(inputCodeForTest))
  throw new Error("codeForTest must be true or false");
const codeForTest = inputCodeForTest === "true";

function applyActions(filePath) {
  const absFilePath = path.join(__dirname, filePath);
  let data = fs.readFileSync(absFilePath, "utf8");
  data = data
    .split("\n")
    .map((line) => {
      const forTesting = line.indexOf("// for testing") >= 0;
      const forProduction = line.indexOf("// for production") >= 0;
      if (!forTesting && !forProduction) return line;

      const { index: i } = /[\S]/i.exec(line); // search first non whitespace
      const comment =
        (forProduction && codeForTest) || (forTesting && !codeForTest);
      if (comment) {
        if (line.slice(i, i + 3) === "// ") return line;
        return line.slice(0, i) + "// " + line.slice(i);
      } else {
        if (line.slice(i, i + 3) === "// ")
          return line.slice(0, i) + line.slice(i + 3);
        return line;
      }
    })
    .join("\n");
  fs.writeFileSync(absFilePath, data);
}

applyActions("./contracts/fogata/assembly/ManaDelegable.ts");
applyActions("./contracts/fogata/assembly/Fogata.ts");
