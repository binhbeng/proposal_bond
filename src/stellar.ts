import { Client, networks, rpc } from "proposal-bond-client";
import { TransactionBuilder } from "@stellar/stellar-sdk";
import { isConnected, getAddress, signTransaction, requestAccess } from "@stellar/freighter-api";

// Testnet RPC endpoint
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const CONTRACT_ID = networks.testnet.contractId;

// Initialize the Soroban Client
export const getStellarClient = () => {
  return new Client({
    ...networks.testnet,
    rpcUrl: RPC_URL,
  });
};

// Initialize the RPC server for manual transaction submission and status check
export const getRpcServer = () => {
  return new rpc.Server(RPC_URL);
};

// Check if Freighter extension is installed and active
export const checkFreighterConnection = async (): Promise<boolean> => {
  try {
    const res = await isConnected();
    return !!res.isConnected;
  } catch (error) {
    console.error("Error checking Freighter connection:", error);
    return false;
  }
};

// Request user's public key (address) from Freighter
export const getFreighterAddress = async (): Promise<string> => {
  try {
    const active = await checkFreighterConnection();
    if (!active) {
      throw new Error("Freighter wallet is not detected. Please install the Freighter extension.");
    }
    const res = await getAddress();
    if (res.error) {
      throw new Error(res.error.message || "Failed to retrieve address from Freighter.");
    }
    if (!res.address) {
      throw new Error("No address returned. Please unlock your Freighter wallet.");
    }
    return res.address;
  } catch (error: any) {
    throw new Error(error.message || "Failed to retrieve address from Freighter");
  }
};

// Trigger explicit Freighter access authorization request (prompts user)
export const requestFreighterAccess = async (): Promise<string> => {
  try {
    const active = await checkFreighterConnection();
    if (!active) {
      throw new Error("Freighter wallet is not detected. Please install the Freighter extension.");
    }
    const res = await requestAccess();
    if (res.error) {
      throw new Error(res.error.message || "Access request rejected by user.");
    }
    if (!res.address) {
      throw new Error("No address returned from Freighter access request.");
    }
    return res.address;
  } catch (error: any) {
    throw new Error(error.message || "Failed to authorize Freighter");
  }
};

// Helper to sign transaction using Freighter and submit to Soroban RPC
export const signAndSubmitTransaction = async (assembledTx: any): Promise<any> => {
  try {
    // 1. Get the raw XDR of the simulated transaction
    const xdr = assembledTx.toXDR();
    
    // 2. Request signature from Freighter on Testnet
    const result = await signTransaction(xdr, {
      networkPassphrase: networks.testnet.networkPassphrase,
    });

    if (result.error) {
      throw new Error(result.error.message || "Transaction signing was rejected or failed.");
    }

    const signedTxXdr = result.signedTxXdr;
    if (!signedTxXdr) {
      throw new Error("Transaction signing returned empty result.");
    }

    // 3. Convert back to Transaction object for SDK sendTransaction
    const tx = TransactionBuilder.fromXDR(signedTxXdr, networks.testnet.networkPassphrase);

    // 4. Send transaction to Soroban RPC server
    const rpcServer = getRpcServer();
    const sendResponse = await rpcServer.sendTransaction(tx);

    if (sendResponse.status === "ERROR") {
      throw new Error(`RPC send error: ${JSON.stringify(sendResponse.errorResult || sendResponse)}`);
    }

    const txHash = sendResponse.hash;
    console.log("Transaction submitted. Hash:", txHash);

    // 5. Poll transaction status
    let pollAttempts = 0;
    const maxPollAttempts = 30; // 30 attempts * 1.5s = 45s max wait
    
    while (pollAttempts < maxPollAttempts) {
      const getTxResponse = await rpcServer.getTransaction(txHash);
      const status = getTxResponse.status;

      if (status === "SUCCESS") {
        console.log("Transaction succeeded!");
        return getTxResponse;
      } else if (status === "FAILED") {
        throw new Error(`Transaction execution failed. Diagnostic: ${JSON.stringify(getTxResponse)}`);
      } else if (status === "NOT_FOUND" || status === "PENDING") {
        // Wait and poll again
        await new Promise((resolve) => setTimeout(resolve, 1500));
        pollAttempts++;
      } else {
        throw new Error(`Unknown transaction status: ${status}`);
      }
    }

    throw new Error("Transaction confirmation timed out.");
  } catch (error: any) {
    console.error("Sign and submit error:", error);
    throw new Error(error.message || "Failed to process transaction.");
  }
};

// --- View Queries ---

// Get current bond amount (u32)
export const fetchBondAmount = async (): Promise<number> => {
  const client = getStellarClient();
  const tx = await client.get_bond_amount();
  return tx.result;
};

// Get current quorum threshold (u32)
export const fetchQuorum = async (): Promise<number> => {
  const client = getStellarClient();
  const tx = await client.get_quorum();
  return tx.result;
};

// Get status and full data of a proposal by ID
export interface ProposalData {
  id: string;
  proposer: string;
  amount: number;
  contentHash: string;
  participation: number;
  status: number; // 0 = Active, 1 = Quorum, 2 = Slashed, 3 = Claimed, 4 = Forfeited
}

export const fetchProposal = async (proposalId: string): Promise<ProposalData | null> => {
  try {
    const client = getStellarClient();
    const tx = await client.get_proposal({ proposal_id: proposalId });
    const p = tx.result;
    return {
      id: proposalId,
      proposer: p.proposer,
      amount: p.amount,
      contentHash: p.content_hash,
      participation: p.participation,
      status: p.status,
    };
  } catch (error) {
    console.warn(`Proposal "${proposalId}" not found or failed to fetch:`, error);
    return null;
  }
};

// --- Mutation Actions ---

// Create a new proposal (locks bond)
export const createProposal = async (
  proposerAddress: string,
  proposalId: string,
  contentHash: string
): Promise<any> => {
  const client = getStellarClient();
  const assembledTx = await client.create_proposal({
    proposer: proposerAddress,
    proposal_id: proposalId,
    content_hash: contentHash,
  });
  return await signAndSubmitTransaction(assembledTx);
};

// Finalize a proposal
export const finalizeProposal = async (
  anyoneAddress: string,
  proposalId: string,
  participationCount: number
): Promise<any> => {
  const client = getStellarClient();
  const assembledTx = await client.finalize({
    anyone: anyoneAddress,
    proposal_id: proposalId,
    participation_count: participationCount,
  });
  return await signAndSubmitTransaction(assembledTx);
};

// Proposer claims their bond back
export const claimBondBack = async (
  proposerAddress: string,
  proposalId: string
): Promise<any> => {
  const client = getStellarClient();
  const assembledTx = await client.claim_bond_back({
    proposer: proposerAddress,
    proposal_id: proposalId,
  });
  return await signAndSubmitTransaction(assembledTx);
};

// Admin slashes the bond
export const slashBond = async (
  adminAddress: string,
  proposalId: string,
  recipientAddress: string
): Promise<any> => {
  const client = getStellarClient();
  const assembledTx = await client.slash_bond({
    admin: adminAddress,
    proposal_id: proposalId,
    recipient: recipientAddress,
  });
  return await signAndSubmitTransaction(assembledTx);
};

// Admin updates required bond amount
export const updateBondAmount = async (
  adminAddress: string,
  amount: number
): Promise<any> => {
  const client = getStellarClient();
  const assembledTx = await client.set_bond({
    admin: adminAddress,
    amount: amount,
  });
  return await signAndSubmitTransaction(assembledTx);
};

// Admin updates quorum threshold
export const updateQuorumThreshold = async (
  adminAddress: string,
  quorum: number
): Promise<any> => {
  const client = getStellarClient();
  const assembledTx = await client.set_quorum({
    admin: adminAddress,
    quorum: quorum,
  });
  return await signAndSubmitTransaction(assembledTx);
};
