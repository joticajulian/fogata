import fs from "fs";
import path from "path";
import { Signer, Contract, Provider } from "koilib";
import { TransactionJson } from "koilib/lib/interface";
import * as dotenv from "dotenv";
import tokenAbi from "../build/token-abi.json";
import koinosConfig from "../koinos.config.js.js";

dotenv.config();

const [networkName] = process.argv.slice(2);

async function main() {
  const network = koinosConfig.networks[networkName || "harbinger"];
  if (!network) throw new Error(`network ${networkName} not found`);
  const provider = new Provider(network.rpcNodes);
  const accountWithFunds = Signer.fromWif(
    network.accounts.manaSupporter.privateKey
  );
  const contractOwner = Signer.fromWif(
    network.accounts.contractOwner.privateKey
  );
  const contractAccount = Signer.fromWif(network.accounts.contract.privateKey);
  accountWithFunds.provider = provider;
  contractAccount.provider = provider;
  contractOwner.provider = provider;

  const contract = new Contract({
    id: contractAccount.address,
    signer: contractAccount,
    abi: tokenAbi,
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

  const { operation: takeOwnership } = await contract.functions.set_owner(
    {
      account: contractOwner.address,
    },
    {
      onlyOperation: true,
    }
  );

  const { receipt, transaction } = await contract.deploy({
    abi: JSON.stringify(tokenAbi),
    nextOperations: [takeOwnership],
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
