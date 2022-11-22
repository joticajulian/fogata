import { Contract, Provider, Signer } from "koilib";
import * as dotenv from "dotenv";
import tokenAbi from "../build/token-abi.json";

dotenv.config();

const privateKeyContract = process.env.PRIVATE_KEY_CONTRACT ?? "";

async function main() {
  const contractAccount = Signer.fromWif(privateKeyContract);
  const contract = new Contract({
    // provider: new Provider(["http://api.koinos.io:8080"]),
    id: contractAccount.address,
    signer: Signer.fromSeed("test"),
    provider: new Provider(["https://api.koinosblocks.com"]),
    abi: tokenAbi,
  }).functions;

  const { result } = await contract.get_info({});
  console.log(result);

  const { result: result2 } = await contract.balance_of({
    owner: contractAccount.address,
  });
  console.log("balance of ", contractAccount.address);
  console.log(result2);
}

main()
  .then(() => {})
  .catch((error) => console.error(error));
