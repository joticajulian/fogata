import { Signer, Contract, Provider } from "koilib";
import { TransactionJson } from "koilib/lib/interface";
import * as dotenv from "dotenv";
import tokenAbi from "../build/token-abi.json";

dotenv.config();

const privateKeyManaSupporter = process.env.PRIVATE_KEY_MANA_SUPPORTER ?? "";
const privateKeyContract = process.env.PRIVATE_KEY_CONTRACT ?? "";

async function main() {
  const provider = new Provider(["http://api.koinos.io:8080"]);
  // const provider = new Provider(["https://api.koinosblocks.com"]);
  const accountWithFunds = Signer.fromWif(privateKeyManaSupporter);
  const contractAccount = Signer.fromWif(privateKeyContract);
  accountWithFunds.provider = provider;
  contractAccount.provider = provider;

  const contract = new Contract({
    id: contractAccount.address,
    signer: contractAccount,
    provider,
    abi: tokenAbi,
    options: {
      payer: accountWithFunds.address,
      beforeSend: async (tx: TransactionJson) => {
        await accountWithFunds.signTransaction(tx);
      },
    },
  });

  const params = {
    to: contractAccount.address,
    value: "123456789",
  };
  const { receipt, transaction } = await contract.functions.mint(params);
  console.log("Transaction submitted. Receipt: ");
  console.log(receipt);
  const { blockNumber } = await transaction.wait("byBlock", 60000);
  console.log(`New coins minted (block number ${blockNumber})`);
  console.log(params);
}

main()
  .then(() => {})
  .catch((error) => console.error(error));
