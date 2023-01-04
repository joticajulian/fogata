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
