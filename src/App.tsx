import { useState, useEffect } from "react";
import {
  checkFreighterConnection,
  getFreighterAddress,
  requestFreighterAccess,
  fetchBondAmount,
  fetchQuorum,
  fetchProposal,
  createProposal,
  finalizeProposal,
  claimBondBack,
  slashBond,
  updateBondAmount,
  updateQuorumThreshold,
  CONTRACT_ID,
} from "./stellar";
import type { ProposalData } from "./stellar";


// Default proposal IDs to watch if localStorage is empty
const DEFAULT_WATCHED_IDS = ["PROP_100", "ALPHA_PROP", "COMMUNITY_01"];

function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [isFreighterActive, setIsFreighterActive] = useState<boolean>(false);
  
  // Contract global parameters
  const [bondAmount, setBondAmount] = useState<number | null>(null);
  const [quorum, setQuorum] = useState<number | null>(null);
  
  // Proposals list
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  
  // Form states
  const [newPropId, setNewPropId] = useState("");
  const [newPropHash, setNewPropHash] = useState("");
  const [importPropId, setImportPropId] = useState("");
  const [adminBond, setAdminBond] = useState("");
  const [adminQuorum, setAdminQuorum] = useState("");
  
  // In-proposal actions states
  const [finalizePart, setFinalizePart] = useState<Record<string, string>>({});
  const [slashRecip, setSlashRecip] = useState<Record<string, string>>({});

  // UI States
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [pendingTx, setPendingTx] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Initialize Freighter and load globals
  useEffect(() => {
    const initApp = async () => {
      try {
        const isConnected = await checkFreighterConnection();
        setIsFreighterActive(isConnected);
        
        if (isConnected) {
          try {
            // Attempt to auto-fetch address if unlocked
            const addr = await getFreighterAddress();
            setAddress(addr);
          } catch (e) {
            console.log("Wallet locked or user denied auto-connect");
          }
        }
        
        await loadGlobalParams();
      } catch (e: any) {
        console.error("Initialization error:", e);
        setErrorMsg("Failed to connect to Stellar network.");
      } finally {
        setLoadingGlobal(false);
      }
    };

    initApp();
  }, []);

  // Fetch proposals data when watched IDs change
  useEffect(() => {
    loadProposals();
  }, [bondAmount]); // Reload when global bond updates or on mount

  const loadGlobalParams = async () => {
    try {
      const amt = await fetchBondAmount();
      const q = await fetchQuorum();
      setBondAmount(amt);
      setQuorum(q);
    } catch (e) {
      console.error("Error loading contract globals:", e);
    }
  };

  const getWatchedIds = (): string[] => {
    const stored = localStorage.getItem("proposal_bond_watched");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return DEFAULT_WATCHED_IDS;
      }
    }
    return DEFAULT_WATCHED_IDS;
  };

  const saveWatchedIds = (ids: string[]) => {
    localStorage.setItem("proposal_bond_watched", JSON.stringify(ids));
  };

  const loadProposals = async () => {
    const ids = getWatchedIds();
    const loadedProposals: ProposalData[] = [];
    
    for (const id of ids) {
      const data = await fetchProposal(id);
      if (data) {
        loadedProposals.push(data);
      } else {
        // If not found on chain, add a placeholder draft entry so the user knows it can be created
        loadedProposals.push({
          id,
          proposer: "Not Created Yet",
          amount: bondAmount || 0,
          contentHash: "N/A",
          participation: 0,
          status: -1, // Custom code for not deployed/created
        });
      }
    }
    
    setProposals(loadedProposals);
  };

  const handleConnectWallet = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const addr = await requestFreighterAccess();
      setAddress(addr);
      setSuccessMsg("Wallet connected successfully!");
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to connect Freighter.");
    }
  };

  const showFeedback = (success: string | null, error: string | null) => {
    setSuccessMsg(success);
    setErrorMsg(error);
    if (success) {
      // Clear success alert after 5 seconds
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  // Actions
  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    if (!newPropId.trim() || !newPropHash.trim()) {
      showFeedback(null, "Please enter both Proposal ID and Content Hash.");
      return;
    }

    setPendingTx(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    try {
      await createProposal(address, newPropId.trim(), newPropHash.trim());
      
      // Save to watched list
      const watched = getWatchedIds();
      if (!watched.includes(newPropId.trim())) {
        const updated = [...watched, newPropId.trim()];
        saveWatchedIds(updated);
      }
      
      showFeedback(`Proposal "${newPropId}" created successfully!`, null);
      setNewPropId("");
      setNewPropHash("");
      
      await loadProposals();
    } catch (e: any) {
      showFeedback(null, e.message || "Failed to create proposal.");
    } finally {
      setPendingTx(false);
    }
  };

  const handleImportProposal = (e: React.FormEvent) => {
    e.preventDefault();
    const id = importPropId.trim();
    if (!id) return;
    
    const watched = getWatchedIds();
    if (watched.includes(id)) {
      showFeedback(null, `Proposal "${id}" is already on your watchlist.`);
      return;
    }
    
    const updated = [...watched, id];
    saveWatchedIds(updated);
    setImportPropId("");
    showFeedback(`Proposal "${id}" added to watchlist.`, null);
    loadProposals();
  };

  const handleRemoveFromWatchlist = (id: string) => {
    const watched = getWatchedIds();
    const updated = watched.filter((item) => item !== id);
    saveWatchedIds(updated);
    showFeedback(`Removed "${id}" from watchlist.`, null);
    loadProposals();
  };

  const handleFinalize = async (proposalId: string) => {
    if (!address) return;
    const partCountStr = finalizePart[proposalId];
    if (!partCountStr || isNaN(Number(partCountStr))) {
      showFeedback(null, "Please enter a valid numeric participation count.");
      return;
    }

    setPendingTx(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    try {
      await finalizeProposal(address, proposalId, Number(partCountStr));
      showFeedback(`Proposal "${proposalId}" finalized successfully!`, null);
      
      // Clear form input
      setFinalizePart(prev => {
        const next = { ...prev };
        delete next[proposalId];
        return next;
      });
      
      await loadProposals();
    } catch (e: any) {
      showFeedback(null, e.message || "Failed to finalize proposal.");
    } finally {
      setPendingTx(false);
    }
  };

  const handleClaimBond = async (proposalId: string) => {
    if (!address) return;
    setPendingTx(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    try {
      await claimBondBack(address, proposalId);
      showFeedback(`Bond for proposal "${proposalId}" claimed back successfully!`, null);
      await loadProposals();
    } catch (e: any) {
      showFeedback(null, e.message || "Failed to claim bond.");
    } finally {
      setPendingTx(false);
    }
  };

  const handleSlashBond = async (proposalId: string) => {
    if (!address) return;
    const recipient = slashRecip[proposalId];
    if (!recipient || recipient.length < 50) {
      showFeedback(null, "Please enter a valid recipient Stellar public key.");
      return;
    }

    setPendingTx(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    try {
      await slashBond(address, proposalId, recipient.trim());
      showFeedback(`Bond for proposal "${proposalId}" slashed and sent to recipient successfully!`, null);
      
      // Clear form input
      setSlashRecip(prev => {
        const next = { ...prev };
        delete next[proposalId];
        return next;
      });
      
      await loadProposals();
    } catch (e: any) {
      showFeedback(null, e.message || "Failed to slash bond. Make sure you are the contract admin.");
    } finally {
      setPendingTx(false);
    }
  };

  const handleUpdateBond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    const amt = Number(adminBond);
    if (isNaN(amt) || amt <= 0) {
      showFeedback(null, "Please enter a valid bond amount.");
      return;
    }

    setPendingTx(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    try {
      await updateBondAmount(address, amt);
      showFeedback(`Bond amount updated to ${amt} successfully!`, null);
      setAdminBond("");
      await loadGlobalParams();
    } catch (e: any) {
      showFeedback(null, e.message || "Failed to update bond amount. Make sure you are the contract admin.");
    } finally {
      setPendingTx(false);
    }
  };

  const handleUpdateQuorum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    const q = Number(adminQuorum);
    if (isNaN(q) || q <= 0) {
      showFeedback(null, "Please enter a valid quorum count.");
      return;
    }

    setPendingTx(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    try {
      await updateQuorumThreshold(address, q);
      showFeedback(`Quorum threshold updated to ${q} successfully!`, null);
      setAdminQuorum("");
      await loadGlobalParams();
    } catch (e: any) {
      showFeedback(null, e.message || "Failed to update quorum. Make sure you are the contract admin.");
    } finally {
      setPendingTx(false);
    }
  };

  // Maps BondStatus enum
  const renderStatusBadge = (status: number) => {
    switch (status) {
      case -1:
        return <span className="status-badge active" style={{ opacity: 0.5 }}>Uncreated</span>;
      case 0:
        return <span className="status-badge active">Active</span>;
      case 1:
        return <span className="status-badge quorum">Quorum Met</span>;
      case 2:
        return <span className="status-badge slashed">Slashed</span>;
      case 3:
        return <span className="status-badge claimed">Claimed</span>;
      case 4:
        return <span className="status-badge forfeited">Forfeited</span>;
      default:
        return <span className="status-badge active">Unknown</span>;
    }
  };

  return (
    <>
      <div className="glow-effect"></div>
      <div className="glow-effect-left"></div>

      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">PB</div>
          <span className="logo-text">proposal_bond</span>
        </div>
        
        <div className="header-stats">
          <span className="network-badge">Stellar Testnet</span>
          {!isFreighterActive && (
            <span className="network-badge" style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", color: "var(--color-slashed)", borderColor: "rgba(239, 68, 68, 0.3)" }}>
              Freighter Not Found
            </span>
          )}
          {address ? (
            <button className="freighter-btn connected" onClick={handleConnectWallet}>
              <span className="wallet-dot"></span>
              {address.slice(0, 5)}...{address.slice(-5)}
            </button>
          ) : (
            <button className="freighter-btn" onClick={handleConnectWallet}>
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <main className="dashboard-container">
        {/* Left column - Controls & Stats */}
        <section className="sidebar">
          {/* Global statistics */}
          <div className="glass-card">
            <h2 className="glass-card-title">
              📊 Global Parameters
            </h2>
            {loadingGlobal ? (
              <div style={{ textAlign: "center", padding: "1rem" }}>
                <span className="spinner"></span>
                <p style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>Loading from Testnet...</p>
              </div>
            ) : (
              <div className="stat-grid">
                <div className="stat-box">
                  <div className="stat-label">Required Bond</div>
                  <div className="stat-value">{bondAmount !== null ? bondAmount : "0"}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Quorum Threshold</div>
                  <div className="stat-value">{quorum !== null ? quorum : "0"}</div>
                </div>
              </div>
            )}
            <div style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--text-muted)", wordBreak: "break-all" }}>
              <strong>Contract ID:</strong>
              <div style={{ fontFamily: "var(--font-mono)", marginTop: "0.25rem", color: "var(--text-secondary)" }}>
                {CONTRACT_ID}
              </div>
            </div>
          </div>

          {/* Form to submit new proposal */}
          <div className="glass-card">
            <h2 className="glass-card-title">
              ✍️ Submit Proposal
            </h2>
            {!address ? (
              <div className="empty-state" style={{ padding: "1rem 0" }}>
                <p style={{ fontSize: "0.85rem" }}>Please connect your Freighter wallet to submit proposals.</p>
                <button className="btn-primary" onClick={handleConnectWallet}>
                  Connect Wallet
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateProposal}>
                <div className="form-group">
                  <label className="form-label" htmlFor="prop-id">Proposal ID (Symbol/Text)</label>
                  <input
                    id="prop-id"
                    type="text"
                    className="form-input"
                    placeholder="e.g. PROP_100"
                    value={newPropId}
                    onChange={(e) => setNewPropId(e.target.value)}
                    disabled={pendingTx}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="prop-hash">Content Hash / Symbol</label>
                  <input
                    id="prop-hash"
                    type="text"
                    className="form-input"
                    placeholder="e.g. QmHash..."
                    value={newPropHash}
                    onChange={(e) => setNewPropHash(e.target.value)}
                    disabled={pendingTx}
                  />
                  <div className="form-note">
                    Note: Submitting will lock the required bond of {bondAmount} count on-chain.
                  </div>
                </div>
                <button type="submit" className="btn-primary" disabled={pendingTx}>
                  {pendingTx ? <span className="spinner"></span> : "Lock Bond & Create"}
                </button>
              </form>
            )}
          </div>

          {/* Watch list control */}
          <div className="glass-card">
            <h2 className="glass-card-title">
              🔍 Import Proposal
            </h2>
            <form onSubmit={handleImportProposal}>
              <div className="form-group">
                <label className="form-label" htmlFor="import-id">Proposal ID to Watch</label>
                <input
                  id="import-id"
                  type="text"
                  className="form-input"
                  placeholder="e.g. ALPHA_PROP"
                  value={importPropId}
                  onChange={(e) => setImportPropId(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)" }}>
                Watch Proposal
              </button>
            </form>
          </div>

          {/* Admin Controls */}
          <div className="glass-card">
            <h2 className="glass-card-title">
              ⚙️ Admin Config
            </h2>
            {!address ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Connect wallet with admin permissions to configure contract.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <form onSubmit={handleUpdateBond} style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
                  <div className="form-group" style={{ marginBottom: "0.75rem" }}>
                    <label className="form-label" htmlFor="admin-bond">New Bond Amount</label>
                    <input
                      id="admin-bond"
                      type="number"
                      className="form-input"
                      placeholder="e.g. 150"
                      value={adminBond}
                      onChange={(e) => setAdminBond(e.target.value)}
                      disabled={pendingTx}
                    />
                  </div>
                  <button type="submit" className="btn-action" style={{ width: "100%" }} disabled={pendingTx}>
                    Update Bond
                  </button>
                </form>
                <form onSubmit={handleUpdateQuorum}>
                  <div className="form-group" style={{ marginBottom: "0.75rem" }}>
                    <label className="form-label" htmlFor="admin-quorum">New Quorum Threshold</label>
                    <input
                      id="admin-quorum"
                      type="number"
                      className="form-input"
                      placeholder="e.g. 5"
                      value={adminQuorum}
                      onChange={(e) => setAdminQuorum(e.target.value)}
                      disabled={pendingTx}
                    />
                  </div>
                  <button type="submit" className="btn-action" style={{ width: "100%" }} disabled={pendingTx}>
                    Update Quorum
                  </button>
                </form>
              </div>
            )}
          </div>
        </section>

        {/* Right column - Main Dashboard view */}
        <section className="main-content">
          {/* Messages Alert */}
          {errorMsg && (
            <div className="alert alert-error">
              <span>⚠️</span> {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="alert alert-success">
              <span>✅</span> {successMsg}
            </div>
          )}
          {pendingTx && (
            <div className="alert alert-info">
              <span className="spinner" style={{ borderColor: "rgba(59, 130, 246, 0.3)", borderTopColor: "var(--color-active)" }}></span>
              Sending transaction to Soroban network. Please approve the popup in Freighter...
            </div>
          )}

          {/* Proposals Watchlist Section */}
          <div className="glass-card" style={{ flexGrow: 1 }}>
            <h2 className="glass-card-title" style={{ justifyContent: "space-between" }}>
              <span>📋 Proposals Watchlist</span>
              <button className="btn-action" onClick={loadProposals} style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }} disabled={pendingTx}>
                🔄 Refresh
              </button>
            </h2>

            {proposals.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📂</span>
                <p>Your watchlist is empty.</p>
                <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>Submit a new proposal or import an ID to begin tracking.</p>
              </div>
            ) : (
              <div className="proposals-grid">
                {proposals.map((proposal) => {
                  const isCreated = proposal.status !== -1;
                  const isActive = proposal.status === 0;
                  const isQuorumMet = proposal.status === 1;
                  const isSlashed = proposal.status === 2;
                  const isUserProposer = address && proposal.proposer === address;

                  return (
                    <div key={proposal.id} className={`proposal-card ${proposal.status === -1 ? "" : 
                      proposal.status === 0 ? "active" : 
                      proposal.status === 1 ? "quorum" : 
                      proposal.status === 2 ? "slashed" : 
                      proposal.status === 3 ? "claimed" : "forfeited"
                    }`}>
                      <div className="proposal-header">
                        <div className="proposal-id">{proposal.id}</div>
                        {renderStatusBadge(proposal.status)}
                      </div>

                      <div className="proposal-hash" title={proposal.contentHash}>
                        Content: {proposal.contentHash}
                      </div>

                      <div className="proposal-details">
                        <div className="detail-item">
                          <span className="detail-label">Bond Size</span>
                          <span className="detail-value">{proposal.amount}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Participation</span>
                          <span className="detail-value">{proposal.participation}</span>
                        </div>
                        <div className="detail-item" style={{ gridColumn: "span 2", borderTop: "1px solid var(--border-color)", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
                          <span className="detail-label">Proposer Address</span>
                          <span className="address-val">{proposal.proposer}</span>
                        </div>
                      </div>

                      <div className="proposal-actions">
                        {/* Draft State - Create Proposal Shortcut */}
                        {!isCreated && (
                          <button
                            className="btn-action success"
                            disabled={!address || pendingTx}
                            onClick={async () => {
                              if (!address) return;
                              setPendingTx(true);
                              setErrorMsg(null);
                              setSuccessMsg(null);
                              try {
                                await createProposal(address, proposal.id, `HASH_${proposal.id}`);
                                showFeedback(`Proposal "${proposal.id}" created successfully!`, null);
                                await loadProposals();
                              } catch (e: any) {
                                showFeedback(null, e.message || "Failed to create proposal.");
                              } finally {
                                setPendingTx(false);
                              }
                            }}
                          >
                            Lock Bond & Deploy
                          </button>
                        )}

                        {/* Active State - Finalize controls */}
                        {isActive && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <input
                                type="number"
                                className="form-input"
                                style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem", width: "80px" }}
                                placeholder="Votes"
                                value={finalizePart[proposal.id] || ""}
                                onChange={(e) => setFinalizePart({
                                  ...finalizePart,
                                  [proposal.id]: e.target.value
                                })}
                                disabled={!address || pendingTx}
                              />
                              <button
                                className="btn-action success"
                                style={{ flexGrow: 1 }}
                                disabled={!address || pendingTx}
                                onClick={() => handleFinalize(proposal.id)}
                              >
                                Finalize
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Quorum Met State - Claim Back Bond */}
                        {isQuorumMet && (
                          <button
                            className="btn-action success"
                            disabled={!address || !isUserProposer || pendingTx}
                            onClick={() => handleClaimBond(proposal.id)}
                            title={isUserProposer ? "Claim your bond back" : "Only the proposer can claim back this bond"}
                          >
                            Claim Bond Back
                          </button>
                        )}

                        {/* Slashed State - Slash Bond to Recipient (Admin only) */}
                        {isSlashed && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <input
                              type="text"
                              className="form-input"
                              style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
                              placeholder="Recipient Public Key"
                              value={slashRecip[proposal.id] || ""}
                              onChange={(e) => setSlashRecip({
                                ...slashRecip,
                                [proposal.id]: e.target.value
                              })}
                              disabled={!address || pendingTx}
                            />
                            <button
                              className="btn-action danger"
                              disabled={!address || pendingTx}
                              onClick={() => handleSlashBond(proposal.id)}
                            >
                              Slash Bond (Admin)
                            </button>
                          </div>
                        )}

                        {/* Remove Watchlist shortcut */}
                        <button
                          className="btn-action"
                          style={{ fontSize: "0.75rem", color: "var(--text-muted)", border: "none", background: "none" }}
                          onClick={() => handleRemoveFromWatchlist(proposal.id)}
                        >
                          Remove from Watchlist
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

export default App;
