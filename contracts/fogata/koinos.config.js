const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

module.exports = {
  class: "Fogata",
  proto: [
    "./proto/fogata.proto",
    "./proto/common.proto",
    "./proto/ownable.proto",
    "./proto/token.proto",
  ],
  files: [
    "./Fogata.ts",
    "./IPoB.ts",
    "./ISponsors.ts",
    "./Ownable.ts",
    "./Pausable.ts",
    "./ManaDelegable.ts",
    "./ConfigurablePool.ts",
  ],
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
          privateKey: process.env.HARBINGER_FOGATA_CONTRACT_PRIVATE_KEY,
        },
        contractOwner: {
          privateKey: process.env.HARBINGER_FOGATA_OWNER_PRIVATE_KEY,
        },
        sponsors: {
          privateKey: process.env.HARBINGER_SPONSORS_CONTRACT_PRIVATE_KEY,
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
          privateKey: process.env.MAINNET_FOGATA_CONTRACT_PRIVATE_KEY,
        },
        contractOwner: {
          privateKey: process.env.MAINNET_FOGATA_OWNER_PRIVATE_KEY,
        },
        sponsors: {
          privateKey: process.env.MAINNET_SPONSORS_CONTRACT_PRIVATE_KEY,
        },
      },
    },
  },
};
