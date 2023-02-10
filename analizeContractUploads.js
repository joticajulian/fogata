const crypto = require("crypto");
const { Provider, utils } = require("koilib");

const contractId = "14iHqMGBznBM7xJXhkrQ266FgoFdymCqLM";

const fogataVersions = [
  {
    version: "1.2.0",
    network: "mainnet",
    hash: "6ed250c3416ec90ed7d1548cbdec1c7211a2398b657ff01061d768f40d3c334b",
    size: 73812,
  },
  /*{
    version: "0.2.1",
    network: "harbinger",
    hash: "f0d044e98b9d5053c97256fd75613056d966ca45d240a1c783dc3615209d712e",
    size: 69659,
  },
  {
    version: "0.3.0",
    network: "harbinger",
    hash: "17c4986b95cbacf6dd0f94d83b9c4c42c3f561ba1dd8aa685cc9b512352e9cb2",
    size: 70231,
  },
  {
    version: "0.4.0",
    network: "harbinger",
    hash: "8efb6d1708aa6aa6f692e8b4618bb136fc086e6857573f5c516ac90ec3fc855b",
    size: 73377,
  },
  {
    version: "0.4.1",
    network: "harbinger",
    hash: "f1963543970b2321158bd4546ed94c5145eaf720689fe33d74578091ceb72b79",
    size: 73387,
  },
  {
    version: "0.4.1",
    network: "mainnet",
    hash: "18f2b2c32b217fdb6700802c3681554ff017200e0d326481e40dcdeb751c2026",
    size: 73377,
  },
  {
    version: "0.4.2",
    network: "harbinger",
    hash: "e070f285b16d08ae071a3e7a36652d688e5e7c62b9b97eccbb4d750d602be868",
    size: 73683,
  },

  {
    version: "0.4.2",
    network: "mainnet",
    hash: "6c65a22b6dd47a2157efe96afe746bd5317d92e49dd8fa5afa219d835c090bf2",
    size: 73673,
  },
  {
    version: "0.4.3",
    network: "harbinger",
    hash: "6357f8dbea7872efab0acd35c82a8be15b68a51a2f429ce08a28415367068497",
    size: 73493,
  },

  {
    version: "0.4.3",
    network: "mainnet",
    hash: "d2cbf1ef72f0219b5bd4d1b002e65ab8a235e088f3f9d166c25b425c93f96757",
    size: 73483,
  },
  {
    version: "0.5.0",
    network: "harbinger",
    hash: "f55133084e32aae8a6a86e8616946db56bfce503210fba132c3dc0c7b83e7a11",
    size: 76171,
  },

  {
    version: "0.5.0",
    network: "mainnet",
    hash: "335d1c9b230b8f56b6ddb97958a69c04b8ccf30e6038fc5c0ec754e9dff4f33e",
    size: 76161,
  },

  {
    version: "0.6.0",
    network: "harbinger",
    hash: "1b94fea2aeb1bc07af314c0fb125349d70462e05165f8fab563e17da578fefc1",
    size: 76245,
  },
  {
    version: "0.6.0",
    network: "mainnet",
    hash: "a146ffc8b6b86ef8ca131edb9cea123ddee659582c6cdea3fb36f231741b88ba",
    size: 76235,
  },*/
];

(async () => {
  // const provider = new Provider(["https://api.koinos.io"]);
  // const provider = new Provider(["https://harbinger-api.koinos.io"]);
  const provider = new Provider(["https://api.koinosblocks.com"]);
  let found = false;
  let seqNum = 0;
  let contractUploads = 0;
  while (!found) {
    const result = await provider.call("account_history.get_account_history", {
      address: contractId,
      ascending: true,
      limit: 500,
      seq_num: seqNum,
    });

    for (let i = 0; i < result.values.length; i += 1) {
      const historyEntry = result.values[i];
      if (!historyEntry.trx) continue;
      const { trx: trxRecord } = historyEntry;
      if (!trxRecord.transaction || !trxRecord.transaction.operations) continue;
      for (let j = 0; j < trxRecord.transaction.operations.length; j += 1) {
        const op = trxRecord.transaction.operations[j];
        if (!op.upload_contract) continue;
        const {
          authorizes_call_contract,
          authorizes_transaction_application,
          authorizes_upload_contract,
        } = op.upload_contract;
        const bytecode = utils.decodeBase64url(op.upload_contract.bytecode);
        const hash = crypto.createHash("sha256").update(bytecode).digest("hex");

        console.log({
          seq_num: historyEntry.seq_num || 0,
          trxId: trxRecord.transaction.id,
          opType: "upload_contract",
          hash,
          authorizes_call_contract,
          authorizes_transaction_application,
          authorizes_upload_contract,
        });
        contractUploads += 1;
        if (
          !authorizes_call_contract ||
          !authorizes_transaction_application ||
          !authorizes_upload_contract
        ) {
          console.log("INVALID: All authorizations should be overriden");
        }
        const fogata = fogataVersions.find((f) => f.hash === hash);
        if (!fogata) {
          console.log(
            "INVALID: The contract does not correspond to any version of Fogata"
          );
          continue;
        }
        if (fogata.size !== bytecode.length) {
          console.log(
            `INVALID: Fogata v${fogata.version} detected but its size ${bytecode.length} should be ${fogata.size}`
          );
        }
        console.log(`FOGATA v${fogata.version}-${fogata.network} detected!`);
        //found = true;
      }
    }
    const lastSeqNum = Number(result.values[result.values.length - 1].seq_num);
    if (!found)
      console.log(`no fogata implementations found: seq_num ${lastSeqNum}`);
    seqNum += 500;
    console.log({
      lastSeqNum,
      seqNum,
    });
    if (lastSeqNum < seqNum - 1) {
      console.log(`search ended in seq_num ${lastSeqNum}`);
      break;
    }
  }
  console.log(`number of contract uploads: ${contractUploads}`);
})();
