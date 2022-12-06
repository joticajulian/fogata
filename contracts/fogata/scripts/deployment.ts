import fs from "fs";
import path from "path";
import { Signer, Contract, Provider } from "koilib";
import { TransactionJson } from "koilib/lib/interface";
import * as dotenv from "dotenv";
import abi from "../build/fogata-abi.json";
import koinosConfig from "../koinos.config.js";
import { contractDetails } from "../../utils";

dotenv.config();

const [inputNetworkName] = process.argv.slice(2);

async function main() {
  const networkName = inputNetworkName || "harbinger";
  const network = koinosConfig.networks[networkName];
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

  const wasmFile = path.join(__dirname, "../build/release/contract.wasm");
  const contract = new Contract({
    id: contractAccount.address,
    abi,
    signer: contractAccount,
    provider,
    bytecode: fs.readFileSync(wasmFile),
    options: {
      payer: accountWithFunds.address,
      beforeSend: async (tx: TransactionJson) => {
        await accountWithFunds.signTransaction(tx);
        await contractOwner.signTransaction(tx);
      },
    },
  });

  contract.options.onlyOperation = true;
  const { operation: takeOwnership } = await contract.functions.set_owner({
    account: contractOwner.address,
  });

  const { operation: setPoolParams } = await contract.functions.set_pool_params(
    {
      name: "fogata",
      image:
        "https://cdn.pixabay.com/photo/2012/04/12/19/11/fire-30231_1280.png",
      description: "koinos mining pool",
      beneficiaries: [
        {
          address: "1AuJQxqqyBZXqqugTQZzXRVRmEYJtsMYQ8",
          percentage: 20000,
        },
      ],
      payment_period: "86400000", // 1 day
    }
  );

  contract.options.onlyOperation = false;
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
  console.log({
    contract: "fogata",
    address: contractAccount.address,
    file: wasmFile,
    ...contractDetails(contract.bytecode),
  });
  console.log(
    `Contract uploaded in block number ${blockNumber} (${networkName})`
  );
}

main()
  .then(() => {})
  .catch((error) => console.error(error));
