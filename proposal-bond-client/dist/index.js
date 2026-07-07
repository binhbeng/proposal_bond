import { Buffer } from "buffer";
import { Client as ContractClient, Spec as ContractSpec, } from "@stellar/stellar-sdk/contract";
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
};
/**
 * Lifecycle status of a proposal's locked bond.
 *
 * `Active`       = bond is locked, proposal not yet finalized.
 * `Quorum`       = finalized with enough participation, proposer may claim back.
 * `Slashed`      = finalized with too little participation, admin may slash.
 * `Claimed`      = proposer has already withdrawn the bond.
 * `Forfeited`    = admin has already transferred the bond to a recipient.
 */
export var BondStatus;
(function (BondStatus) {
    BondStatus[BondStatus["Active"] = 0] = "Active";
    BondStatus[BondStatus["Quorum"] = 1] = "Quorum";
    BondStatus[BondStatus["Slashed"] = 2] = "Slashed";
    BondStatus[BondStatus["Claimed"] = 3] = "Claimed";
    BondStatus[BondStatus["Forfeited"] = 4] = "Forfeited";
})(BondStatus || (BondStatus = {}));
export class Client extends ContractClient {
    options;
    static async deploy(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options) {
        return ContractClient.deploy(null, options);
    }
    constructor(options) {
        super(new ContractSpec(["AAAAAQAAADVPbi1jaGFpbiByZWNvcmQgYXR0YWNoZWQgdG8gZXZlcnkgc3VibWl0dGVkIHByb3Bvc2FsLgAAAAAAAAAAAAAIUHJvcG9zYWwAAAAFAAAAAAAAAAZhbW91bnQAAAAAAAQAAAAAAAAADGNvbnRlbnRfaGFzaAAAABEAAAAAAAAADXBhcnRpY2lwYXRpb24AAAAAAAAEAAAAAAAAAAhwcm9wb3NlcgAAABMAAAAAAAAABnN0YXR1cwAAAAAH0AAAAApCb25kU3RhdHVzAAA=",
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
            "AAAAAAAAALBSZXR1cm5zIHRoZSBjdXJyZW50IGJvbmQgc3RhdHVzIG9mIGBwcm9wb3NhbF9pZGAgYXMgYSBgdTMyYCBjb2RlOgowID0gQWN0aXZlLCAxID0gUXVvcnVtLCAyID0gU2xhc2hlZCwgMyA9IENsYWltZWQsIDQgPSBGb3JmZWl0ZWQuClJldHVybnMgYDBgIHdoZW4gdGhlIHByb3Bvc2FsIGRvZXMgbm90IGV4aXN0LgAAAA9nZXRfYm9uZF9zdGF0dXMAAAAAAQAAAAAAAAALcHJvcG9zYWxfaWQAAAAAEQAAAAEAAAAE"]), options);
        this.options = options;
    }
    fromJSON = {
        init: (this.txFromJSON),
        finalize: (this.txFromJSON),
        set_bond: (this.txFromJSON),
        get_quorum: (this.txFromJSON),
        set_quorum: (this.txFromJSON),
        slash_bond: (this.txFromJSON),
        get_proposal: (this.txFromJSON),
        claim_bond_back: (this.txFromJSON),
        create_proposal: (this.txFromJSON),
        get_bond_amount: (this.txFromJSON),
        get_bond_status: (this.txFromJSON)
    };
}
