import fs from "fs";
import path from "path";
import { Signer, Contract, Provider } from "koilib";
import { TransactionJson } from "koilib/lib/interface";
import * as dotenv from "dotenv";
import tokenAbi from "../build/fogata-abi.json";

dotenv.config();

const privateKeyManaSupporter = process.env.PRIVATE_KEY_MANA_SUPPORTER ?? "";
const privateKeyContract = process.env.PRIVATE_KEY_CONTRACT ?? "";

async function main() {
  // const provider = new Provider(["http://api.koinos.io:8080"]);
  const provider = new Provider(["https://api.koinosblocks.com"]);
  const accountWithFunds = Signer.fromWif(privateKeyManaSupporter);
  const contractAccount = Signer.fromWif(privateKeyContract);
  accountWithFunds.provider = provider;
  contractAccount.provider = provider;

  const contract = new Contract({
    signer: contractAccount,
    provider,
    bytecode: fs.readFileSync(
      path.join(__dirname, "../build/release/contract.wasm")
    ),
    options: {
      payer: accountWithFunds.address,
      beforeSend: async (tx: TransactionJson) => {
        await accountWithFunds.signTransaction(tx);
      },
    },
  });

  const { receipt, transaction } = await contract.deploy({
    abi: JSON.stringify(tokenAbi),
  });
  console.log("Transaction submitted. Receipt: ");
  console.log(receipt);
  const { blockNumber } = await transaction.wait("byBlock", 60000);
  console.log(
    `Contract ${contractAccount.address} uploaded in block number ${blockNumber}`
  );
}

main()
  .then(() => {})
  .catch((error) => console.error(error));
