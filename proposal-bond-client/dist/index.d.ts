import { Buffer } from "buffer";
import { AssembledTransaction, Client as ContractClient, ClientOptions as ContractClientOptions, MethodOptions } from "@stellar/stellar-sdk/contract";
import type { u32 } from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";
export declare const networks: {
    readonly testnet: {
        readonly networkPassphrase: "Test SDF Network ; September 2015";
        readonly contractId: "CDDJKSJ54ISCDLGXEWML5OUEKUY3I3FCHPAJPQEY4276FIJWTVRRXOFT";
    };
};
/**
 * On-chain record attached to every submitted proposal.
 */
export interface Proposal {
    amount: u32;
    content_hash: string;
    participation: u32;
    proposer: string;
    status: BondStatus;
}
/**
 * Lifecycle status of a proposal's locked bond.
 *
 * `Active`       = bond is locked, proposal not yet finalized.
 * `Quorum`       = finalized with enough participation, proposer may claim back.
 * `Slashed`      = finalized with too little participation, admin may slash.
 * `Claimed`      = proposer has already withdrawn the bond.
 * `Forfeited`    = admin has already transferred the bond to a recipient.
 */
export declare enum BondStatus {
    Active = 0,
    Quorum = 1,
    Slashed = 2,
    Claimed = 3,
    Forfeited = 4
}
export interface Client {
    /**
     * Construct and simulate a init transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Initialize the contract. Must be called exactly once by `admin`.
     * Sets the required bond amount and the quorum participation threshold.
     */
    init: ({ admin, bond_amount, quorum }: {
        admin: string;
        bond_amount: u32;
        quorum: u32;
    }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a finalize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Anyone may call `finalize` once voting has closed. The recorded
     * `participation_count` is compared against the quorum threshold to
     * decide whether the proposal is rewarded (quorum) or punishable (slashed).
     */
    finalize: ({ anyone, proposal_id, participation_count }: {
        anyone: string;
        proposal_id: string;
        participation_count: u32;
    }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a set_bond transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Admin updates the required bond amount.
     */
    set_bond: ({ admin, amount }: {
        admin: string;
        amount: u32;
    }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a get_quorum transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Returns the configured quorum threshold.
     */
    get_quorum: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>;
    /**
     * Construct and simulate a set_quorum transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Admin updates the quorum participation threshold.
     */
    set_quorum: ({ admin, quorum }: {
        admin: string;
        quorum: u32;
    }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a slash_bond transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Admin transfers a slashed bond to `recipient`. Only callable on
     * proposals that have been finalized as `Slashed`.
     */
    slash_bond: ({ admin, proposal_id, recipient }: {
        admin: string;
        proposal_id: string;
        recipient: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<u32>>;
    /**
     * Construct and simulate a get_proposal transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Returns the stored proposal record, or panics if it does not exist.
     */
    get_proposal: ({ proposal_id }: {
        proposal_id: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Proposal>>;
    /**
     * Construct and simulate a claim_bond_back transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * The original proposer claims their bond back after a successful
     * (`Quorum`) finalization.
     */
    claim_bond_back: ({ proposer, proposal_id }: {
        proposer: string;
        proposal_id: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<u32>>;
    /**
     * Construct and simulate a create_proposal transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * `proposer` submits a new proposal and locks the configured bond.
     * The bond amount is recorded in storage (no real asset transfer).
     */
    create_proposal: ({ proposer, proposal_id, content_hash }: {
        proposer: string;
        proposal_id: string;
        content_hash: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a get_bond_amount transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Returns the configured bond amount.
     */
    get_bond_amount: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>;
    /**
     * Construct and simulate a get_bond_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Returns the current bond status of `proposal_id` as a `u32` code:
     * 0 = Active, 1 = Quorum, 2 = Slashed, 3 = Claimed, 4 = Forfeited.
     * Returns `0` when the proposal does not exist.
     */
    get_bond_status: ({ proposal_id }: {
        proposal_id: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<u32>>;
}
export declare class Client extends ContractClient {
    readonly options: ContractClientOptions;
    static deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions & Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
    }): Promise<AssembledTransaction<T>>;
    constructor(options: ContractClientOptions);
    readonly fromJSON: {
        init: (json: string) => AssembledTransaction<null>;
        finalize: (json: string) => AssembledTransaction<null>;
        set_bond: (json: string) => AssembledTransaction<null>;
        get_quorum: (json: string) => AssembledTransaction<number>;
        set_quorum: (json: string) => AssembledTransaction<null>;
        slash_bond: (json: string) => AssembledTransaction<number>;
        get_proposal: (json: string) => AssembledTransaction<Proposal>;
        claim_bond_back: (json: string) => AssembledTransaction<number>;
        create_proposal: (json: string) => AssembledTransaction<null>;
        get_bond_amount: (json: string) => AssembledTransaction<number>;
        get_bond_status: (json: string) => AssembledTransaction<number>;
    };
}
