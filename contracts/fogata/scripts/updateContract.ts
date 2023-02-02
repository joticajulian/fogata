import fs from "fs";
import path from "path";
import { Signer, Contract, Provider } from "koilib";
import { TransactionJson } from "koilib/lib/interface";
import * as dotenv from "dotenv";
import abiNoPower from "../build/fogata-abi.json";
import abiPower from "../build/fogata-abi-power.json";
import koinosConfig from "../koinos.config.js";
import { contractDetails } from "../../utils";

dotenv.config();

const [inputNetworkName, inputPower] = process.argv.slice(2);

async function main() {
  const networkName = inputNetworkName || "harbinger";
  const power = inputPower || "";
  if (!["power", ""].includes(power))
    throw new Error(`invalid power option ${power}`);
  const network = koinosConfig.networks[networkName];
  if (!network) throw new Error(`network ${networkName} not found`);
  const provider = new Provider(network.rpcNodes);
  const accountWithFunds = Signer.fromWif(
    network.accounts.manaSharer.privateKey
  );
  const contractOwner = Signer.fromWif(
    network.accounts.contractOwner.privateKey
  );
  accountWithFunds.provider = provider;
  contractOwner.provider = provider;

  let filename: string;
  if (networkName === "mainnet" && power === "") {
    filename = "fogata.wasm";
  } else if (networkName === "mainnet" && power === "power") {
    filename = "fogata-power.wasm";
  } else if (networkName === "harbinger" && power === "") {
    filename = "fogata-harbinger.wasm";
  } else if (networkName === "harbinger" && power === "power") {
    filename = "fogata-power-harbinger.wasm";
  } else {
    throw new Error("error with filename");
  }
  const wasmFile = path.join(__dirname, "../build/release", filename);

  if (!network.accounts.contract.id)
    throw new Error(
      "the contract id of the pool is not defined in the env variables"
    );

  const abi = power ? abiPower : abiNoPower;
  const contract = new Contract({
    id: network.accounts.contract.id,
    abi,
    signer: contractOwner,
    provider,
    bytecode: fs.readFileSync(wasmFile),
    options: {
      payer: accountWithFunds.address,
      beforeSend: async (tx: TransactionJson) => {
        await accountWithFunds.signTransaction(tx);
      },
    },
  });

  const { receipt, transaction } = await contract.deploy({
    abi: JSON.stringify(abi),
    authorizesCallContract: true,
    authorizesTransactionApplication: true,
    authorizesUploadContract: true,
  });
  console.log("Transaction submitted. Receipt: ");
  console.log(receipt);
  const { blockNumber } = await transaction.wait("byBlock", 60000);
  console.log({
    contract: "fogata",
    address: contract.getId(),
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
