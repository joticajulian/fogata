import { Contract, Provider } from "koilib";
import * as dotenv from "dotenv";
import abiNoPower from "../build/fogata-abi.json";
import abiPower from "../build/fogata-abi-power.json";
import koinosConfig from "../koinos.config.js";

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

  if (!network.accounts.contract.id)
    throw new Error(
      "the contract id of the pool is not defined in the env variables"
    );

  const abi = power ? abiPower : abiNoPower;
  const contract = new Contract({
    id: network.accounts.contract.id,
    abi,
    provider,
  }).functions;

  const { result } = await contract.get_accounts({
    limit: 32,
  });
  console.log(result);
}

main()
  .then(() => {})
  .catch((error) => console.error(error));
