const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

module.exports = {
  class: "Pools",
  proto: [
    "./proto/common.proto",
    "./proto/ownable.proto",
    "./proto/pools.proto",
  ],
  files: ["./Pools.ts", "./Ownable.ts", "./IOwnable.ts"],
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
        manaSharer: {
          privateKey: process.env.HARBINGER_MANA_SHARER_PRIVATE_KEY,
        },
        contract: {
          privateKey: process.env.HARBINGER_POOLS_CONTRACT_PRIVATE_KEY,
        },
        contractOwner: {
          privateKey: process.env.HARBINGER_POOLS_OWNER_PRIVATE_KEY,
        },
      },
    },
    mainnet: {
      rpcNodes: ["https://api.koinosblocks.com", "https://api.koinos.io"],
      accounts: {
        manaSharer: {
          privateKey: process.env.MAINNET_MANA_SHARER_PRIVATE_KEY,
        },
        contract: {
          privateKey: process.env.MAINNET_POOLS_CONTRACT_PRIVATE_KEY,
        },
        contractOwner: {
          privateKey: process.env.MAINNET_POOLS_OWNER_PRIVATE_KEY,
        },
      },
    },
  },
};
