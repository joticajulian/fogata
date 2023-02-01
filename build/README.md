## [Fogata v1.2.0](https://github.com/joticajulian/fogata/releases/tag/v1.2.0) (2023-02-01)

property | value
--- | ---
size (mainnet) | 73812 bytes (72.08 kB)
sha256 (mainnet) | 6ed250c3416ec90ed7d1548cbdec1c7211a2398b657ff01061d768f40d3c334b
size (harbinger) | 73822 bytes (72.09 kB)
sha256 (harbinger) | f89a3c941c6290a92300c3a1717ca2fb633b6641abcba1acda9edf4ecfdcdb61
size (mainnet-power) | 75925 bytes (74.15 kB)
sha256 (mainnet-power) | 0ee1221a8e99eb66355bab6a8a302157014ae55a1ca751aab35fb1a67ec15285
size (harbinger-power) | 75935 bytes (74.16 kB)
sha256 (harbinger-power) | aec46c75cc8071288a5898f2b19f4908b04d62a1ef12ece44478ebd3313ed137

### 🚀 Features

- renaming of variables, functions and classes:
  * ManaDelegable -> KoinReservable
  * reservedKoins -> allReservedKoin
  * get_available_koins -> get_available_koin
  * set_reserved_koins -> set_all_reserved_koin (only in power mode)
  * balancesManaDelegators -> balancesReservedKoin
  * get_reserved_koins -> get_all_reserved_koin
  * get_mana_delegation -> get_reserved_koin
  * add_mana_delegation -> add_reserved_koin
  * remove_mana_delegation -> remove_reserved_koin

## [Fogata v1.1.1](https://github.com/joticajulian/fogata/releases/tag/v1.1.1) (2023-01-30)

property | value
--- | ---
size (mainnet) | 73820 bytes (72.09 kB)
sha256 (mainnet) | 814f37ca8e2969849c1de58037982f1ae5611808b099cbbdc8ffda033a61ff76
size (harbinger) | 73830 bytes (72.1 kB)
sha256 (harbinger) | 3203babfe138ce3c84788160fcc469c8e7d09f48dbf3725e95d53ea999ea70af
size (mainnet-power) | 75935 bytes (74.16 kB)
sha256 (mainnet-power) | 8bb43019e3379e7178f75f682335b64bd45d74499971451d27d5cbdeb1e89e6d
size (harbinger-power) | 75945 bytes (74.17 kB)
sha256 (harbinger-power) | 533137c0ce9c17a7413c9f354928f2d08907b3e2ba4eadfa45ecc76ddbebd1a3

### 🚀 Features

- code compiled for POWER (where owner have extra powers: pause contract, upgrade contract, set pool state, set reserved koins)

## [Fogata v1.1.0](https://github.com/joticajulian/fogata/releases/tag/v1.1.0) (2023-01-27)

property | value
--- | ---
size (mainnet) | 73820 bytes (72.09 kB)
sha256 (mainnet) | 937c9ae4b61ec067686351e03beb5fcb09f6c16377e6468af3ee8e093d42cf9a
size (harbinger) | 73830 bytes (72.1 kB)
sha256 (harbinger) | 3313ffcc0dc8980dcfa3ceaf0b792f160909b37301eee1256f9f8648405fde54

### 🚀 Features

- integrate changes from v0.8.1

## [Fogata v0.8.1](https://github.com/joticajulian/fogata/releases/tag/v0.8.1) (2023-01-27)

property | value
--- | ---
size (mainnet) | 76044 bytes (74.26 kB)
sha256 (mainnet) | c7efa6c04f93ac6d4bd48a9b3642c8bf4e8f9bdb564f3913ab191f21a3f81594
size (harbinger) | 76054 bytes (74.27 kB)
sha256 (harbinger) | 5dcd3b8d52503124b286f1a20d78843b9c37a68ee87f73f62bcb154d6b6dac2b

### 🐛 Bug Fixes

- sub0 function to fix inaccuracies

## [Fogata v0.8.0](https://github.com/joticajulian/fogata/releases/tag/v0.8.0) (2023-01-26)

property | value
--- | ---
size (mainnet) | 76921 bytes (75.12 kB)
sha256 (mainnet) | 8cc3858faed6a2e71271e43ed1f0f8e5304a382c36e2a7ddadf239caa345efa0
size (harbinger) | 76931 bytes (75.13 kB)
sha256 (harbinger) | 2f2ef84355b7c7266c2acfcda6dc4adbacac419c33a8487c94870b6b72fafd6c

### 🚀 Features

- new function `get_vapor_withdrawn` (for debug purposes).

## [Fogata v1.0.0](https://github.com/joticajulian/fogata/releases/tag/v1.0.0) (2023-01-25)

property | value
--- | ---
size (mainnet) | 74492 bytes (72.75 kB)
sha256 (mainnet) | feb1edef5a30f4b607aed4e6d74f971073a8bcd2e6aaf2b42f6e2cef44653c27
size (harbinger) | 74502 bytes (72.76 kB)
sha256 (harbinger) | 94dfd27c5ec69438d0035aa4e6ef359401a41f4f56eb834c6659dd1ee12e5525

### 🚀 Features

- the super powers of the owner have been removed: cannot upgrade contract,
set pool state, set reserved koins, or pause the contract.
- `collect_vapor` is removed.
- improvements in the `initialDeploy` script.

## [Fogata v0.7.0](https://github.com/joticajulian/fogata/releases/tag/v0.7.0) (2023-01-23)

property | value
--- | ---
size (mainnet) | 76728 bytes (74.93 kB)
sha256 (mainnet) | fca629cb90f34417a3247a95280772302fdbec435b0d108ad6ce7c1be31aa173
size (harbinger) | 76738 bytes (74.94 kB)
sha256 (harbinger) | c27045922fa17650dc29978ce3dffb8d802d026baba513145be89e92478609a3

### 🚀 Features

- fogata version can be read from pool state

### 🐛 Bug Fixes

- fix ABI for javascript in collect_koin_preferences

## [Fogata v0.6.0](https://github.com/joticajulian/fogata/releases/tag/v0.6.0) (2023-01-10)

property | value
--- | ---
size (mainnet) | 76235 bytes (74.45 kB)
sha256 (mainnet) | a146ffc8b6b86ef8ca131edb9cea123ddee659582c6cdea3fb36f231741b88ba
size (harbinger) | 76245 bytes (74.46 kB)
sha256 (harbinger) | 1b94fea2aeb1bc07af314c0fb125349d70462e05165f8fab563e17da578fefc1

### 🚀 Features

- new calculation of vapor balance that allows accumulation (in previous versions the vapor was lost if you don't collect it).
- `get_pool_state` now gives the updated values
- new function `get_pool_state_no_updated`
- count number of users
- improvements to refreshBalance, renamed to getPoolStateUpdated

## [Fogata v0.5.0](https://github.com/joticajulian/fogata/releases/tag/v0.5.0) (2023-01-08)

property | value
--- | ---
size (mainnet) | 76161 bytes (74.38 kB)
sha256 (mainnet) | 335d1c9b230b8f56b6ddb97958a69c04b8ccf30e6038fc5c0ec754e9dff4f33e
size (harbinger) | 76171 bytes (74.39 kB)
sha256 (harbinger) | f55133084e32aae8a6a86e8616946db56bfce503210fba132c3dc0c7b83e7a11

### 🚀 Features

- definition of collect koin preferences to be used for automatic transfers
- `collect_vapor` will be deprecated in the future. Use `collect` instead which is for koin and vapor
- new script to updateContract

### 🐛 Bug Fixes

- fix validation of pool params

## [Fogata v0.4.3](https://github.com/joticajulian/fogata/releases/tag/v0.4.3) (2023-01-04)

property | value
--- | ---
size (mainnet) | 73483 bytes (71.76 kB)
sha256 (mainnet) | d2cbf1ef72f0219b5bd4d1b002e65ab8a235e088f3f9d166c25b425c93f96757
size (harbinger) | 73493 bytes (71.77 kB)
sha256 (harbinger) | 6357f8dbea7872efab0acd35c82a8be15b68a51a2f429ce08a28415367068497

### 🐛 Bug Fixes

- `vapor_withdrawn` was not updated in the pool state when using `collect_vapor`. It is fixed now.
- A duplicated `System.require` was removed.

## [Fogata v0.4.2](https://github.com/joticajulian/fogata/releases/tag/v0.4.2) (2023-01-04)

property | value
--- | ---
size (mainnet) | 73673 bytes (71.95 kB)
sha256 (mainnet) | 6c65a22b6dd47a2157efe96afe746bd5317d92e49dd8fa5afa219d835c090bf2
size (harbinger) | 73683 bytes (71.96 kB)
sha256 (harbinger) | e070f285b16d08ae071a3e7a36652d688e5e7c62b9b97eccbb4d750d602be868

### 🚀 Features

- `set_reserved_koins` was temporarily added to be able to fix a bug in that variable.

### 🐛 Bug Fixes

- fix `pay_beneficiary`: reserved koins was only updated for Sponsors and not the rest of beneficiaries. Now it is applied to all cases.

## [Fogata v0.4.1](https://github.com/joticajulian/fogata/releases/tag/v0.4.1) (2023-01-02)

property | value
--- | ---
size (mainnet) | 73377 bytes (71.66 kB)
sha256 (mainnet) | 18f2b2c32b217fdb6700802c3681554ff017200e0d326481e40dcdeb751c2026
size (harbinger) | 73387 bytes (71.67 kB)
sha256 (harbinger) | f1963543970b2321158bd4546ed94c5145eaf720689fe33d74578091ceb72b79

### 🚀 Features

- Build for mainnet and harbinger

## [Fogata v0.4.0](https://github.com/joticajulian/fogata/releases/tag/v0.4.0) (2022-12-28)

property | value
--- | ---
size | 73377 bytes (71.66 kB)
sha256 (harbinger) | 8efb6d1708aa6aa6f692e8b4618bb136fc086e6857573f5c516ac90ec3fc855b

### 🚀 Features

- Rename variables using the terms snapshot and reburn
- Refactor: using updateSnapshotUser function
- Refactor balance: using getBalanceToken function
- `get_accounts` function

### 🐛 Bug Fixes

- Use require when there is no time to reburn
- patch bug koinos/sdk-as
- Vapor token: use require in transfer and burn

## [Fogata v0.3.0](https://github.com/joticajulian/fogata/releases/tag/v0.3.0) (2022-12-23)

property | value
--- | ---
size | 70231 bytes (68.58 kB)
sha256 (harbinger) | 17c4986b95cbacf6dd0f94d83b9c4c42c3f561ba1dd8aa685cc9b512352e9cb2

### 🚀 Features

- Pools: Contract to manage the list of pools to be displayed in webpage
- `set_pool_state` function to be used for testing purposes
- Documentation in the README: How it works
- ABI and WASM of pools and sponsors contract in the build folder

### 🐛 Bug Fixes

- Refresh balances before paying beneficiaries

## [Fogata v0.2.1](https://github.com/joticajulian/fogata/releases/tag/v0.2.1) (2022-12-14)

property | value
--- | ---
size | 69659 bytes (68.03 kB)
sha256 (harbinger) | f0d044e98b9d5053c97256fd75613056d966ca45d240a1c783dc3615209d712e
