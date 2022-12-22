import { Signer, Contract, Provider } from "koilib";
import * as dotenv from "dotenv";
import abi from "../build/pools-abi.json";
import koinosConfig from "../koinos.config.js";
import { utils } from "koilib";

dotenv.config();

const [inputNetworkName] = process.argv.slice(2);

async function main() {
  const networkName = inputNetworkName || "harbinger";
  const network = koinosConfig.networks[networkName];
  if (!network) throw new Error(`network ${networkName} not found`);
  const contract = new Contract({
    id: Signer.fromWif(network.accounts.contract.privateKey).address,
    abi,
    provider: new Provider(network.rpcNodes),
  }).functions;

  console.log("empty is:");
  console.log(utils.decodeBase58(""));

  const { result: submitted } = await contract.get_submitted_pools({
    start: "",
    limit: 10,
    direction: 0, //"ascending"
  });
  console.log("Submitted Pools");
  console.log(JSON.stringify(submitted, null, 2));

  const { result: approved } = await contract.get_approved_pools({
    start: "",
    limit: 10,
    direction: 0, //"ascending"
  });
  console.log("Approved Pools");
  console.log(JSON.stringify(approved, null, 2));
}

main()
  .then(() => {})
  .catch((error) => console.error(error));
