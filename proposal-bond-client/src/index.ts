import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CDDJKSJ54ISCDLGXEWML5OUEKUY3I3FCHPAJPQEY4276FIJWTVRRXOFT",
  }
} as const


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
export enum BondStatus {
  Active = 0,
  Quorum = 1,
  Slashed = 2,
  Claimed = 3,
  Forfeited = 4,
}

export interface Client {
  /**
   * Construct and simulate a init transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialize the contract. Must be called exactly once by `admin`.
   * Sets the required bond amount and the quorum participation threshold.
   */
  init: ({admin, bond_amount, quorum}: {admin: string, bond_amount: u32, quorum: u32}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a finalize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Anyone may call `finalize` once voting has closed. The recorded
   * `participation_count` is compared against the quorum threshold to
   * decide whether the proposal is rewarded (quorum) or punishable (slashed).
   */
  finalize: ({anyone, proposal_id, participation_count}: {anyone: string, proposal_id: string, participation_count: u32}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_bond transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Admin updates the required bond amount.
   */
  set_bond: ({admin, amount}: {admin: string, amount: u32}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_quorum transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the configured quorum threshold.
   */
  get_quorum: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a set_quorum transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Admin updates the quorum participation threshold.
   */
  set_quorum: ({admin, quorum}: {admin: string, quorum: u32}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a slash_bond transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Admin transfers a slashed bond to `recipient`. Only callable on
   * proposals that have been finalized as `Slashed`.
   */
  slash_bond: ({admin, proposal_id, recipient}: {admin: string, proposal_id: string, recipient: string}, options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a get_proposal transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the stored proposal record, or panics if it does not exist.
   */
  get_proposal: ({proposal_id}: {proposal_id: string}, options?: MethodOptions) => Promise<AssembledTransaction<Proposal>>

  /**
   * Construct and simulate a claim_bond_back transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * The original proposer claims their bond back after a successful
   * (`Quorum`) finalization.
   */
  claim_bond_back: ({proposer, proposal_id}: {proposer: string, proposal_id: string}, options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a create_proposal transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * `proposer` submits a new proposal and locks the configured bond.
   * The bond amount is recorded in storage (no real asset transfer).
   */
  create_proposal: ({proposer, proposal_id, content_hash}: {proposer: string, proposal_id: string, content_hash: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_bond_amount transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the configured bond amount.
   */
  get_bond_amount: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a get_bond_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the current bond status of `proposal_id` as a `u32` code:
   * 0 = Active, 1 = Quorum, 2 = Slashed, 3 = Claimed, 4 = Forfeited.
   * Returns `0` when the proposal does not exist.
   */
  get_bond_status: ({proposal_id}: {proposal_id: string}, options?: MethodOptions) => Promise<AssembledTransaction<u32>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAQAAADVPbi1jaGFpbiByZWNvcmQgYXR0YWNoZWQgdG8gZXZlcnkgc3VibWl0dGVkIHByb3Bvc2FsLgAAAAAAAAAAAAAIUHJvcG9zYWwAAAAFAAAAAAAAAAZhbW91bnQAAAAAAAQAAAAAAAAADGNvbnRlbnRfaGFzaAAAABEAAAAAAAAADXBhcnRpY2lwYXRpb24AAAAAAAAEAAAAAAAAAAhwcm9wb3NlcgAAABMAAAAAAAAABnN0YXR1cwAAAAAH0AAAAApCb25kU3RhdHVzAAA=",
        "AAAAAAAAAIZJbml0aWFsaXplIHRoZSBjb250cmFjdC4gTXVzdCBiZSBjYWxsZWQgZXhhY3RseSBvbmNlIGJ5IGBhZG1pbmAuClNldHMgdGhlIHJlcXVpcmVkIGJvbmQgYW1vdW50IGFuZCB0aGUgcXVvcnVtIHBhcnRpY2lwYXRpb24gdGhyZXNob2xkLgAAAAAABGluaXQAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAC2JvbmRfYW1vdW50AAAAAAQAAAAAAAAABnF1b3J1bQAAAAAABAAAAAA=",
        "AAAAAwAAAYdMaWZlY3ljbGUgc3RhdHVzIG9mIGEgcHJvcG9zYWwncyBsb2NrZWQgYm9uZC4KCmBBY3RpdmVgICAgICAgID0gYm9uZCBpcyBsb2NrZWQsIHByb3Bvc2FsIG5vdCB5ZXQgZmluYWxpemVkLgpgUXVvcnVtYCAgICAgICA9IGZpbmFsaXplZCB3aXRoIGVub3VnaCBwYXJ0aWNpcGF0aW9uLCBwcm9wb3NlciBtYXkgY2xhaW0gYmFjay4KYFNsYXNoZWRgICAgICAgPSBmaW5hbGl6ZWQgd2l0aCB0b28gbGl0dGxlIHBhcnRpY2lwYXRpb24sIGFkbWluIG1heSBzbGFzaC4KYENsYWltZWRgICAgICAgPSBwcm9wb3NlciBoYXMgYWxyZWFkeSB3aXRoZHJhd24gdGhlIGJvbmQuCmBGb3JmZWl0ZWRgICAgID0gYWRtaW4gaGFzIGFscmVhZHkgdHJhbnNmZXJyZWQgdGhlIGJvbmQgdG8gYSByZWNpcGllbnQuAAAAAAAAAAAKQm9uZFN0YXR1cwAAAAAABQAAAAAAAAAGQWN0aXZlAAAAAAAAAAAAAAAAAAZRdW9ydW0AAAAAAAEAAAAAAAAAB1NsYXNoZWQAAAAAAgAAAAAAAAAHQ2xhaW1lZAAAAAADAAAAAAAAAAlGb3JmZWl0ZWQAAAAAAAAE",
        "AAAAAAAAAMtBbnlvbmUgbWF5IGNhbGwgYGZpbmFsaXplYCBvbmNlIHZvdGluZyBoYXMgY2xvc2VkLiBUaGUgcmVjb3JkZWQKYHBhcnRpY2lwYXRpb25fY291bnRgIGlzIGNvbXBhcmVkIGFnYWluc3QgdGhlIHF1b3J1bSB0aHJlc2hvbGQgdG8KZGVjaWRlIHdoZXRoZXIgdGhlIHByb3Bvc2FsIGlzIHJld2FyZGVkIChxdW9ydW0pIG9yIHB1bmlzaGFibGUgKHNsYXNoZWQpLgAAAAAIZmluYWxpemUAAAADAAAAAAAAAAZhbnlvbmUAAAAAABMAAAAAAAAAC3Byb3Bvc2FsX2lkAAAAABEAAAAAAAAAE3BhcnRpY2lwYXRpb25fY291bnQAAAAABAAAAAA=",
        "AAAAAAAAACdBZG1pbiB1cGRhdGVzIHRoZSByZXF1aXJlZCBib25kIGFtb3VudC4AAAAACHNldF9ib25kAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAQAAAAA",
        "AAAAAAAAAChSZXR1cm5zIHRoZSBjb25maWd1cmVkIHF1b3J1bSB0aHJlc2hvbGQuAAAACmdldF9xdW9ydW0AAAAAAAAAAAABAAAABA==",
        "AAAAAAAAADFBZG1pbiB1cGRhdGVzIHRoZSBxdW9ydW0gcGFydGljaXBhdGlvbiB0aHJlc2hvbGQuAAAAAAAACnNldF9xdW9ydW0AAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAGcXVvcnVtAAAAAAAEAAAAAA==",
        "AAAAAAAAAHBBZG1pbiB0cmFuc2ZlcnMgYSBzbGFzaGVkIGJvbmQgdG8gYHJlY2lwaWVudGAuIE9ubHkgY2FsbGFibGUgb24KcHJvcG9zYWxzIHRoYXQgaGF2ZSBiZWVuIGZpbmFsaXplZCBhcyBgU2xhc2hlZGAuAAAACnNsYXNoX2JvbmQAAAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAALcHJvcG9zYWxfaWQAAAAAEQAAAAAAAAAJcmVjaXBpZW50AAAAAAAAEwAAAAEAAAAE",
        "AAAAAAAAAENSZXR1cm5zIHRoZSBzdG9yZWQgcHJvcG9zYWwgcmVjb3JkLCBvciBwYW5pY3MgaWYgaXQgZG9lcyBub3QgZXhpc3QuAAAAAAxnZXRfcHJvcG9zYWwAAAABAAAAAAAAAAtwcm9wb3NhbF9pZAAAAAARAAAAAQAAB9AAAAAIUHJvcG9zYWw=",
        "AAAAAAAAAFhUaGUgb3JpZ2luYWwgcHJvcG9zZXIgY2xhaW1zIHRoZWlyIGJvbmQgYmFjayBhZnRlciBhIHN1Y2Nlc3NmdWwKKGBRdW9ydW1gKSBmaW5hbGl6YXRpb24uAAAAD2NsYWltX2JvbmRfYmFjawAAAAACAAAAAAAAAAhwcm9wb3NlcgAAABMAAAAAAAAAC3Byb3Bvc2FsX2lkAAAAABEAAAABAAAABA==",
        "AAAAAAAAAIFgcHJvcG9zZXJgIHN1Ym1pdHMgYSBuZXcgcHJvcG9zYWwgYW5kIGxvY2tzIHRoZSBjb25maWd1cmVkIGJvbmQuClRoZSBib25kIGFtb3VudCBpcyByZWNvcmRlZCBpbiBzdG9yYWdlIChubyByZWFsIGFzc2V0IHRyYW5zZmVyKS4AAAAAAAAPY3JlYXRlX3Byb3Bvc2FsAAAAAAMAAAAAAAAACHByb3Bvc2VyAAAAEwAAAAAAAAALcHJvcG9zYWxfaWQAAAAAEQAAAAAAAAAMY29udGVudF9oYXNoAAAAEQAAAAA=",
        "AAAAAAAAACNSZXR1cm5zIHRoZSBjb25maWd1cmVkIGJvbmQgYW1vdW50LgAAAAAPZ2V0X2JvbmRfYW1vdW50AAAAAAAAAAABAAAABA==",
        "AAAAAAAAALBSZXR1cm5zIHRoZSBjdXJyZW50IGJvbmQgc3RhdHVzIG9mIGBwcm9wb3NhbF9pZGAgYXMgYSBgdTMyYCBjb2RlOgowID0gQWN0aXZlLCAxID0gUXVvcnVtLCAyID0gU2xhc2hlZCwgMyA9IENsYWltZWQsIDQgPSBGb3JmZWl0ZWQuClJldHVybnMgYDBgIHdoZW4gdGhlIHByb3Bvc2FsIGRvZXMgbm90IGV4aXN0LgAAAA9nZXRfYm9uZF9zdGF0dXMAAAAAAQAAAAAAAAALcHJvcG9zYWxfaWQAAAAAEQAAAAEAAAAE" ]),
      options
    )
  }
  public readonly fromJSON = {
    init: this.txFromJSON<null>,
        finalize: this.txFromJSON<null>,
        set_bond: this.txFromJSON<null>,
        get_quorum: this.txFromJSON<u32>,
        set_quorum: this.txFromJSON<null>,
        slash_bond: this.txFromJSON<u32>,
        get_proposal: this.txFromJSON<Proposal>,
        claim_bond_back: this.txFromJSON<u32>,
        create_proposal: this.txFromJSON<null>,
        get_bond_amount: this.txFromJSON<u32>,
        get_bond_status: this.txFromJSON<u32>
  }
}