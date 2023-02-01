# Fogata

Fogata is a mining pool for koinos blockchain. From the infrastructure perspective it is exactly the same infrastructure as solo mining: It requires a node running the koinos blockchain configured for block production. The difference is that the producer is **controlled by a smart contract**.

This smart contract defines how a group of people can collaborate together to have a common address holding Virtual Hash Power (VHP), and use this VHP to produce blocks. The contract gives the production rights to a specific account, the node operator, who is responsible for providing the hardware and run the node for block production. This node operator receives a certain percentage of the profits made by the pool. The rest of the profits are distributed to the participants of the pool, and optionally to specific accounts defined as "beneficiaries" (like the sponsors contract, which will be explained later on).

## Owner of the Pool

The Owner is the creator of the pool and the one that can define the parameters of it:

- Name and description.
- Node operator: The owner registers the public key of the node operator in the PoB contract.
- Percentages for participants: Rewards to the people joining the pool.
- Percentages for beneficiaries: Profits destinated to the node operator and/or other entities.
- Reburn period: This defines the frequency of the reburns, and it also calculates the amount of KOIN that each user can withdraw.

Also, in testnet and in the launch of the first fogata pool in the mainnet, the owner has the option to pause the contract, which stops payments, deposits, and withdrawals, and it will be used only to resolve bugs in the first month. After that, the pauser will be removed (and the upgradability of the contract will be locked as well).

## Stake

The participants can send KOIN or VHP to the pool. In the case of KOIN, it is burned in order to get VHP. In return they will receive a token defining the stake in the pool. This token is not transferrable and it's used to calculate the rewards for each user. The rewards are proportional to the stake.

## Unstake

The participants can unstake at any time. And this unstake can be in VHP or KOIN. In the case of KOIN, the contract defines a limit depending on the stake of the user to guarantee that all participants can get KOIN before burning it again.

## Reburn period and distribution of KOIN

One of the challenges in the design of this pool was the logic to distribute KOINs to the participants. Some of the important points desired in fogata are:

- It must define a limit of KOIN for each user depending on the stake.
- It needs to take into account only the stake used during the block production. That is, if the user stakes more KOIN or VHP in the last instant, this change should not be taken into account in the current distribution of KOIN, but in a next period.
- The pool should be able to scale to thousands of participants. Then it cannot use for/while loops in this distribution because transactions are rejected by the blockchain after reaching some limit of computation. _Note: The distribution to beneficiaries can use loops because it is expected to use a small number of beneficiaries._

The resultant design in Fogata to meet these requirements is the following:

- The contract has a reburn period.
- It takes a snapshot of the stakes on each period (similar to the snapshots taken in the ERC20 tokens, which do not use loops).
- It takes a snapshot of the KOINs mined on each period.
- The KOINs mined in a previous period are distributed in the next period based on the snapshot of the stakes. When a user checks the balance, these KOINs are calculated and the user has the option to withdraw them or not.
- The user can withdraw small amounts of KOIN. Then the contract counts the withrawn koin on each account to be able to make the comparison with the limit of KOIN for that period.
- At the end of the period, the KOINs that were not withdrawn are burned, and the counters are reset to zero for the next period.

## Contribute to sponsors contract

The Sponsors contract is a project that aims to create a fund of koins to fund different projects/proposals related to koinos blockchain in order to accelerate the adoption and creation of dApps. And Fogata has a special relationship with this contract and was designed to interact with it.

The contribution to this contract is a decision of the owner of the pool when the beneficiaries are defined. If it is defined then Fogata will call the `contribute` function when making the payments. In return, the Sponsors contract will mint a token called Vapor, which will be used to decide which proposals will be funded.

Then, Fogata distributes this vapor token between the participants in the same way it distributes Koins, using snapshots. In this way, the participants of the pool will be the ones that will decide which projects will be funded.

## Koin reservation

The contract has an extra feature that allows to the owner to insert a certain amount of Koins in the pool with the purpose to use it for mana consumption. Then the pool will be able to produce blocks without consuming the mana from the koins that will be destinated to participants and beneficiaries. These koins will not be taken into account in the calculation of payments or reburns.

## List of pools

In Fogata, the pool parameters are not hardcoded in the code but are saved in the storage of the contract. This design makes it easy configurable, then it is possible to deploy different contracts with different configurations using the same WASM compilation.

The website of Fogata allows different entities to launch their own pool, and list all of these pools in the main page. Overall, Fogata mining pool is a valuable resource for miners looking to contribute to the decentralization of the Koinos network and earn rewards for their efforts. Whether you are a seasoned cryptocurrency miner or just getting started, this mining pool is a great place to get involved and start making a difference.

## Installation

Run `yarn install` to install the required dependencies.

Create a copy of `env.example`, rename it to `.env`, and update its values as explained in the file. This will be needed for the deployment and interaction with the contracts.

Run:

```
yarn build
```

This will make a precompilation in the `contracts/build` folder, and it will build the final compilation in `contracts/build/release/contract.wasm`.

Finally deploy the contract:

```
yarn deploy
```

Now you can consult a blockexplorer, like koinosblocks.com to check your deployment

## Verify code

In order to verify the authenticity of the deployed code, this repo contains a Dockerfile to compile the code and get the wasm file with its corresponding sha256 identifier. Then these values can be compared with the code deployed in the blockchain to prove its authenticity.

Run:

```
docker build --no-cache --progress=plain -t temp-image . && docker rmi temp-image
```

You should see at the end some info from the contract selected:

```
contract: fogata
file:     /contracts/contracts/build/release/contract.wasm
size:     25524 bytes (24.93 kB)
sha256:   c5c06834d91c20cf99ad63a6f1fc656407fb00620f917788dbe8b203adfc4696
```

## License

MIT License

Copyright (c) 2022 Julián González

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
