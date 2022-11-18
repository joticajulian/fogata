import fs from "fs";
import path from "path";
import { Signer, Contract, Provider } from "koilib";
import { TransactionJson } from "koilib/lib/interface";
import * as dotenv from "dotenv";
import tokenAbi from "../build/fogata-abi.json";
import koinosConfig from "../koinos.config.js";

dotenv.config();

const [networkName] = process.argv.slice(2);

async function main() {
  const network = koinosConfig.networks[networkName || "harbinger"];
  if (!network) throw new Error(`network ${networkName} not found`);
  const provider = new Provider(network.rpcNodes);
  const accountWithFunds = Signer.fromWif(
    network.accounts.manaSupporter.privateKey
  );
  const contractAccount = Signer.fromWif(network.accounts.contract.privateKey);
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
