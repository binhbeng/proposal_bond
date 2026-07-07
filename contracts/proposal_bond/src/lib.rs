#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol};

// ---------------------------------------------------------------------------
// Storage types
// ---------------------------------------------------------------------------

/// Lifecycle status of a proposal's locked bond.
///
/// `Active`       = bond is locked, proposal not yet finalized.
/// `Quorum`       = finalized with enough participation, proposer may claim back.
/// `Slashed`      = finalized with too little participation, admin may slash.
/// `Claimed`      = proposer has already withdrawn the bond.
/// `Forfeited`    = admin has already transferred the bond to a recipient.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BondStatus {
    Active = 0,
    Quorum = 1,
    Slashed = 2,
    Claimed = 3,
    Forfeited = 4,
}

/// On-chain record attached to every submitted proposal.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Proposal {
    pub proposer: Address,
    pub amount: u32,
    pub content_hash: Symbol,
    pub participation: u32,
    pub status: BondStatus,
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const ADMIN: Symbol = Symbol::short("ADMIN");
const BOND_AMT: Symbol = Symbol::short("BONDAMT");
const QUORUM: Symbol = Symbol::short("QUORUM");

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

/// `ProposalBond` is a spam-prevention bonding contract for community
/// proposals. To submit a proposal a user must lock a bond equal to the
/// amount configured by the admin. The bond is either returned (when the
/// proposal reaches quorum) or slashed (when participation is too low),
/// discouraging frivolous or low-quality submissions.
#[contract]
pub struct ProposalBond;

#[contractimpl]
impl ProposalBond {
    // -----------------------------------------------------------------------
    // Admin configuration
    // -----------------------------------------------------------------------

    /// Initialize the contract. Must be called exactly once by `admin`.
    /// Sets the required bond amount and the quorum participation threshold.
    pub fn init(env: Env, admin: Address, bond_amount: u32, quorum: u32) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&BOND_AMT, &bond_amount);
        env.storage().instance().set(&QUORUM, &quorum);
    }

    /// Admin updates the required bond amount.
    pub fn set_bond(env: Env, admin: Address, amount: u32) {
        admin.require_auth();
        let stored: Address = env.storage().instance().get(&ADMIN).unwrap();
        if stored != admin {
            panic!("not admin");
        }
        env.storage().instance().set(&BOND_AMT, &amount);
    }

    /// Admin updates the quorum participation threshold.
    pub fn set_quorum(env: Env, admin: Address, quorum: u32) {
        admin.require_auth();
        let stored: Address = env.storage().instance().get(&ADMIN).unwrap();
        if stored != admin {
            panic!("not admin");
        }
        env.storage().instance().set(&QUORUM, &quorum);
    }

    // -----------------------------------------------------------------------
    // Proposal lifecycle
    // -----------------------------------------------------------------------

    /// `proposer` submits a new proposal and locks the configured bond.
    /// The bond amount is recorded in storage (no real asset transfer).
    pub fn create_proposal(
        env: Env,
        proposer: Address,
        proposal_id: Symbol,
        content_hash: Symbol,
    ) {
        proposer.require_auth();

        if env.storage().persistent().has(&proposal_id) {
            panic!("proposal already exists");
        }

        let bond: u32 = env.storage().instance().get(&BOND_AMT).unwrap();
        if bond == 0 {
            panic!("bond amount not configured");
        }

        let proposal = Proposal {
            proposer: proposer.clone(),
            amount: bond,
            content_hash,
            participation: 0,
            status: BondStatus::Active,
        };
        env.storage().persistent().set(&proposal_id, &proposal);
    }

    /// Anyone may call `finalize` once voting has closed. The recorded
    /// `participation_count` is compared against the quorum threshold to
    /// decide whether the proposal is rewarded (quorum) or punishable (slashed).
    pub fn finalize(
        env: Env,
        anyone: Address,
        proposal_id: Symbol,
        participation_count: u32,
    ) {
        anyone.require_auth();

        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&proposal_id)
            .expect("proposal not found");

        if proposal.status != BondStatus::Active {
            panic!("proposal already finalized");
        }

        let quorum: u32 = env.storage().instance().get(&QUORUM).unwrap();
        proposal.participation = participation_count;
        proposal.status = if participation_count >= quorum {
            BondStatus::Quorum
        } else {
            BondStatus::Slashed
        };

        env.storage().persistent().set(&proposal_id, &proposal);
    }

    /// The original proposer claims their bond back after a successful
    /// (`Quorum`) finalization.
    pub fn claim_bond_back(env: Env, proposer: Address, proposal_id: Symbol) -> u32 {
        proposer.require_auth();

        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&proposal_id)
            .expect("proposal not found");

        if proposal.proposer != proposer {
            panic!("not the proposer");
        }
        if proposal.status != BondStatus::Quorum {
            panic!("bond is not claimable");
        }

        let amount = proposal.amount;
        proposal.status = BondStatus::Claimed;
        env.storage().persistent().set(&proposal_id, &proposal);
        amount
    }

    /// Admin transfers a slashed bond to `recipient`. Only callable on
    /// proposals that have been finalized as `Slashed`.
    pub fn slash_bond(
        env: Env,
        admin: Address,
        proposal_id: Symbol,
        _recipient: Address,
    ) -> u32 {
        admin.require_auth();
        let stored: Address = env.storage().instance().get(&ADMIN).unwrap();
        if stored != admin {
            panic!("not admin");
        }

        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&proposal_id)
            .expect("proposal not found");

        if proposal.status != BondStatus::Slashed {
            panic!("proposal is not slashed");
        }

        let amount = proposal.amount;
        proposal.status = BondStatus::Forfeited;
        env.storage().persistent().set(&proposal_id, &proposal);
        amount
    }

    // -----------------------------------------------------------------------
    // Views
    // -----------------------------------------------------------------------

    /// Returns the current bond status of `proposal_id` as a `u32` code:
    /// 0 = Active, 1 = Quorum, 2 = Slashed, 3 = Claimed, 4 = Forfeited.
    /// Returns `0` when the proposal does not exist.
    pub fn get_bond_status(env: Env, proposal_id: Symbol) -> u32 {
        let proposal: Option<Proposal> = env.storage().persistent().get(&proposal_id);
        match proposal {
            Some(p) => match p.status {
                BondStatus::Active => 0,
                BondStatus::Quorum => 1,
                BondStatus::Slashed => 2,
                BondStatus::Claimed => 3,
                BondStatus::Forfeited => 4,
            },
            None => 0,
        }
    }

    /// Returns the stored proposal record, or panics if it does not exist.
    pub fn get_proposal(env: Env, proposal_id: Symbol) -> Proposal {
        env.storage()
            .persistent()
            .get(&proposal_id)
            .expect("proposal not found")
    }

    /// Returns the configured bond amount.
    pub fn get_bond_amount(env: Env) -> u32 {
        env.storage().instance().get(&BOND_AMT).unwrap_or(0)
    }

    /// Returns the configured quorum threshold.
    pub fn get_quorum(env: Env) -> u32 {
        env.storage().instance().get(&QUORUM).unwrap_or(0)
    }
}
