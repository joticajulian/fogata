import fs from "fs";
import path from "path";
import { Signer, Contract, Provider } from "koilib";
import { TransactionJson } from "koilib/lib/interface";
import * as dotenv from "dotenv";
import abi from "../build/fogata-abi.json";
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
  const contractOwner = Signer.fromWif(
    network.accounts.contractOwner.privateKey
  );
  const contractAccount = Signer.fromWif(network.accounts.contract.privateKey);
  accountWithFunds.provider = provider;
  contractAccount.provider = provider;
  contractOwner.provider = provider;

  const contract = new Contract({
    id: contractAccount.address,
    abi,
    signer: contractAccount,
    provider,
    bytecode: fs.readFileSync(
      path.join(__dirname, "../build/release/contract.wasm")
    ),
    options: {
      payer: accountWithFunds.address,
      beforeSend: async (tx: TransactionJson) => {
        await accountWithFunds.signTransaction(tx);
        await contractOwner.signTransaction(tx);
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

  const { operation: setPoolParams } = await contract.functions.set_pool_params(
    {
      name: "fogata",
      image: "https://cdn.pixabay.com/photo/2012/04/12/19/11/fire-30231_1280.png",
      description: "koinos mining pool",
      beneficiaries: [{
        address: "1PobYVhBQkTKcjH1fKUap5ZKcGYKHByapT",
        percentage: 20000,
      }],
      payment_period: "604800000", // 1 week
    },
    {
      onlyOperation: true,
    }
  );

  const { receipt, transaction } = await contract.deploy({
    abi: JSON.stringify(abi),
    authorizesCallContract: true,
    authorizesTransactionApplication: true,
    authorizesUploadContract: true,
    nextOperations: [takeOwnership, setPoolParams],
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
