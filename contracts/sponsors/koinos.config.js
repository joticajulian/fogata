const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

module.exports = {
  class: "Sponsors",
  proto: ["./proto/token.proto", "./proto/common.proto"],
  files: ["./Sponsors.ts"],
  sourceDir: "./assembly",
  buildDir: "./build",
  koinosProtoDir: "../../node_modules/koinos-precompiler-as/koinos-proto",
  networks: {
    harbinger: {
      rpcNodes: [
        "https://harbinger-api.koinos.io",
        "https://testnet.koinosblocks.com",
      ],
      accounts: {
        manaSupporter: {
          privateKey: process.env.HARBINGER_PRIVATE_KEY_MANA_SUPPORTER,
        },
        sponsors: {
          privateKey: process.env.HARBINGER_PRIVATE_KEY_CONTRACT_SPONSORS,
        },
      },
    },
  },
};
