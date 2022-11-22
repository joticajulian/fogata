const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

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
  koinosProtoDir: "../../node_modules/koinos-precompiler-as/koinos-proto",
  networks: {
    harbinger: {
      rpcNodes: ["https://testnet.koinosblocks.com", "https://harbinger-api.koinos.io"],
      accounts: {
        manaSupporter: {
          privateKey: process.env.HARBINGER_PRIVATE_KEY_MANA_SUPPORTER,
        },
        contract: {
          privateKey: process.env.HARBINGER_PRIVATE_KEY_CONTRACT,
        },
        contractOwner: {
          privateKey: process.env.HARBINGER_PRIVATE_KEY_CONTRACT_OWNER,
        },
      },
    },
    mainnet: {
      rpcNodes: ["https://api.koinosblocks.com", "https://api.koinos.io"],
    },
  },
};
