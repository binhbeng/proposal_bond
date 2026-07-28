import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface StatMetric {
  key: string;
  label: string;
  value: number;
  subtitle: string;
}

interface StoredStats {
  walletsConnected: number;
  totalSignIns: number;
  metrics: Record<string, number>;
  lastUpdatedAt: string | null;
}

interface StatsPanelProps {
  projectKey: string;
  title: string;
  subtitle: string;
  walletAddress?: string | null;
  walletConnected: boolean;
  metrics: StatMetric[];
}

export function StatsPanel({ projectKey, title, subtitle, walletAddress, walletConnected, metrics }: StatsPanelProps) {
  const [storedStats, setStoredStats] = useState<StoredStats | null>(null);
  const [loading, setLoading] = useState(false);
  const recordedWalletRef = useRef("");

  const metricsSnapshot = useMemo(
    () => Object.fromEntries(metrics.map((metric) => [metric.key, metric.value])),
    [metrics]
  );

  const syncStats = useCallback(async (payload?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const query = payload ? "" : `?projectKey=${encodeURIComponent(projectKey)}`;
      const response = await fetch(`/api/stats${query}`, {
        method: payload ? "POST" : "GET",
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify({ projectKey, ...payload }) : undefined,
      });
      if (!response.ok) throw new Error("Stats API unavailable");
      setStoredStats(await response.json());
    } catch (error) {
      console.error("Stats sync failed", error);
    } finally {
      setLoading(false);
    }
  }, [projectKey]);

  useEffect(() => {
    syncStats();
  }, [projectKey, syncStats]);

  useEffect(() => {
    syncStats({ type: "snapshot", metrics: metricsSnapshot });
  }, [projectKey, metricsSnapshot, syncStats]);

  useEffect(() => {
    if (!walletConnected || !walletAddress || recordedWalletRef.current === walletAddress) return;
    recordedWalletRef.current = walletAddress;
    syncStats({ type: "wallet_connect", address: walletAddress });
  }, [projectKey, walletAddress, walletConnected, syncStats]);

  return (
    <section className="stats-section">
      <div className="stats-heading">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      {loading && (
        <div className="stats-loading">
          <span className="spinner"></span>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">W</div>
          <div className="stat-value">{storedStats?.walletsConnected ?? (walletConnected ? 1 : 0)}</div>
          <div className="stat-label">Wallets connected</div>
          <div className="stat-subtitle">Distinct Freighter addresses</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">S</div>
          <div className="stat-value">{storedStats?.totalSignIns ?? 0}</div>
          <div className="stat-label">Total sign-ins</div>
          <div className="stat-subtitle">Wallet connect events</div>
        </div>
        {metrics.map((metric) => (
          <div className="stat-card" key={metric.key}>
            <div className="stat-icon">#</div>
            <div className="stat-value">{storedStats?.metrics?.[metric.key] ?? metric.value}</div>
            <div className="stat-label">{metric.label}</div>
            <div className="stat-subtitle">{metric.subtitle}</div>
          </div>
        ))}
        <div className="stat-card">
          <div className="stat-icon">R</div>
          <div className="stat-value">1</div>
          <div className="stat-label">Redis store</div>
          <div className="stat-subtitle">Shared deployment counter</div>
        </div>
      </div>

      <p className="stats-footnote">
        Counts are persisted in Redis{storedStats?.lastUpdatedAt ? ` and last updated ${new Date(storedStats.lastUpdatedAt).toLocaleString()}` : ""}.
      </p>
    </section>
  );
}
