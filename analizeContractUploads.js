const crypto = require("crypto");
const { Provider, utils } = require("koilib");

const contractId = "14iHqMGBznBM7xJXhkrQ266FgoFdymCqLM";

const fogataVersions = [
  {
    version: "0.2.1",
    hash: "f0d044e98b9d5053c97256fd75613056d966ca45d240a1c783dc3615209d712e",
    size: 69659,
  },
  {
    version: "0.3.0",
    hash: "17c4986b95cbacf6dd0f94d83b9c4c42c3f561ba1dd8aa685cc9b512352e9cb2",
    size: 70231,
  },
  {
    version: "0.4.0",
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
];

(async () => {
  const provider = new Provider(["https://api.koinos.io"]);
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
        console.log(`FOGATA v${fogata.version} detected!`);
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
