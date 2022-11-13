module.exports = {
  class: "Fogata",
  proto: [
    "./proto/fogata.proto",
    "./proto/common.proto",
    "./proto/ownable.proto",
  ],
  files: ["./Fogata.ts", "./IPoB.ts", "./Ownable.ts"],
  sourceDir: "./assembly",
  buildDir: "./build",
  koinosProtoDir: "../node_modules/koinos-precompiler-as/koinos-proto",
};
