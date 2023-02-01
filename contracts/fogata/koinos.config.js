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
    "./KoinReservable.ts",
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
          id: process.env.HARBINGER_FOGATA_CONTRACT_ID,
          name: process.env.HARBINGER_FOGATA_CONTRACT_NAME,
          image: process.env.HARBINGER_FOGATA_CONTRACT_IMAGE,
          paymentPeriod: process.env.HARBINGER_FOGATA_CONTRACT_PAYMENT_PERIOD,
          description: process.env.HARBINGER_FOGATA_CONTRACT_DESCRIPTION,
          beneficiaries: process.env.HARBINGER_FOGATA_CONTRACT_BENEFICIARIES,
        },
        contractOwner: {
          privateKey: process.env.HARBINGER_FOGATA_OWNER_PRIVATE_KEY,
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
          id: process.env.MAINNET_FOGATA_CONTRACT_ID,
          name: process.env.MAINNET_FOGATA_CONTRACT_NAME,
          image: process.env.MAINNET_FOGATA_CONTRACT_IMAGE,
          paymentPeriod: process.env.MAINNET_FOGATA_CONTRACT_PAYMENT_PERIOD,
          description: process.env.MAINNET_FOGATA_CONTRACT_DESCRIPTION,
          beneficiaries: process.env.MAINNET_FOGATA_CONTRACT_BENEFICIARIES,
        },
        contractOwner: {
          privateKey: process.env.MAINNET_FOGATA_OWNER_PRIVATE_KEY,
        },
      },
    },
  },
};
