# proposal_bond

## Project Title
proposal_bond

## Project Description
Open community governance spaces are routinely polluted by low-effort or
duplicative proposals that waste reviewers' time. `proposal_bond` is a small
Soroban smart contract that introduces a skin-in-the-game bonding mechanism
for on-chain proposals: any member who wants to put forward a proposal must
first lock a bond. If the proposal reaches the configured participation
quorum the bond is returned; if it ends up under-engaged the bond is
slashed. The result is a cheap, transparent spam filter that runs entirely
on-chain.

## Project Vision
The long-term vision is to make every DAO, community fund, and grant
program deploy a default anti-spam layer on Stellar: a single contract that
standardises how proposals are weighted, how participation is measured, and
how abusive submissions are penalised. By keeping the bond amount, quorum
threshold, and slash recipient fully on-chain and admin-configurable, the
contract can be reused by communities of any size while still giving each
one full control over its own parameters.

## Key Features
- **Admin-configurable bond amount** - the required bond can be updated at
  any time by the contract admin via `set_bond`.
- **Configurable quorum threshold** - participation needed for a proposal
  to be considered successful is stored on-chain and tunable via
  `set_quorum`.
- **One-step proposal submission** - `create_proposal` records the
  proposer, the locked bond amount, and a content hash in a single
  transaction.
- **Trustless finalization** - any address may call `finalize` to compare
  the recorded participation count against the quorum threshold and mark
  the proposal as `Quorum` or `Slashed`.
- **Two-way bond resolution** - honest proposers reclaim their bond with
  `claim_bond_back`, while abusive proposers are penalised when the admin
  invokes `slash_bond` against a recipient.
- **On-chain transparency** - `get_bond_status`, `get_proposal`,
  `get_bond_amount`, and `get_quorum` expose the full lifecycle so any
  front-end or indexer can render it.

## Contract

- **Network:** Stellar Testnet (Public)
- **Scope:** community dApp — see `contracts/proposal_bond/src/lib.rs` for the full proposal_bond business logic.
- **Functions exposed:** see `Key Features` above and the `pub fn` list in `lib.rs`.
- **Contract ID:** `<to be deployed on Stellar Testnet>`
- **Explorer template:** `https://stellar.expert/explorer/testnet/contract/<to`
- **Screenshot of deployed contract on Stellar Expert:**
  `_(Screenshot of the contract page on Stellar Expert will appear here after deploy.)_`


## Future Scope
- **Real on-chain bond custody** - swap the in-storage bond counter for
  actual XLM or custom-asset transfers using the Soroban token interface,
  so the bond is truly escrowed by the contract.
- **On-chain voting** - replace the externally supplied
  `participation_count` with an integrated vote registry so each voter
  authenticates against the contract directly.
- **Time-bounded lifecycle** - add a voting window using `env.ledger()`
  timestamps, with automatic finalization after the deadline.
- **Partial slashing** - support graduated penalties (e.g. slash 25%,
  50%, 100%) depending on how far the proposal is below quorum.
- **Multi-tier admin** - introduce a council address that can override
  slash decisions for dispute resolution.
- **Off-chain indexer / UI** - build a lightweight React dashboard that
  lists proposals, their status, and lets users interact through
  Freighter.

## Profile

- **Name:** <!-- Fill github name -->
- **Project:** `proposal_bond` (community)
- **Built with:** Soroban SDK 25, Rust, Stellar Testnet
