import { useCallback, useEffect, useState } from "react";
import type { InvestmentMandate } from "../trading/tradingPage";

interface UseInvestmentPlansState {
  plans: InvestmentMandate[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useInvestmentPlans(): UseInvestmentPlansState {
  const [plans, setPlans] = useState<InvestmentMandate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/trading/plans", { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Unable to load investment mandates (HTTP ${res.status}).`);
        }
        const payload = (await res.json()) as { mandates?: InvestmentMandate[] };
        if (!active) return;
        setPlans(Array.isArray(payload.mandates) ? payload.mandates : []);
      } catch (err) {
        if (!active || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load investment plans.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [nonce]);

  return { plans, loading, error, reload };
}

export function useInvestmentPlanDetail(planId: string | undefined) {
  const [plan, setPlan] = useState<InvestmentMandate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!planId) {
      setPlan(null);
      setLoading(false);
      setError("Investment plan identifier is missing.");
      return;
    }

    const controller = new AbortController();
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/trading/plans/${encodeURIComponent(planId)}`, {
          signal: controller.signal,
        });
        if (res.status === 404) {
          throw new Error("The requested investment plan was not found.");
        }
        if (!res.ok) {
          throw new Error(`Unable to load plan specifications (HTTP ${res.status}).`);
        }
        const payload = (await res.json()) as { mandate?: InvestmentMandate };
        if (!active) return;
        setPlan(payload.mandate ?? null);
      } catch (err) {
        if (!active || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load plan details.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [planId]);

  return { plan, loading, error };
}
