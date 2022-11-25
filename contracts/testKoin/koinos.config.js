const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

module.exports = {
  class: "Token",
  proto: [
    "./proto/token.proto",
    "./proto/ownable.proto",
    "./proto/common.proto",
  ],
  files: ["./Token.ts", "./Ownable.ts"],
  sourceDir: "./assembly",
  buildDir: "./build",
  koinosProtoDir: "../../node_modules/koinos-precompiler-as/koinos-proto",
  networks: {
    harbinger: {
      rpcNodes: [
        "https://testnet.koinosblocks.com",
        "https://harbinger-api.koinos.io",
      ],
      accounts: {
        manaSupporter: {
          privateKey: process.env.HARBINGER_PRIVATE_KEY_MANA_SUPPORTER,
        },
        contract: {
          privateKey: process.env.HARBINGER_PRIVATE_KEY_CONTRACT_TEST_KOIN,
        },
        contractOwner: {
          privateKey:
            process.env.HARBINGER_PRIVATE_KEY_CONTRACT_OWNER_TEST_KOIN,
        },
      },
    },
  },
};
