import { randomUUID } from "node:crypto";
import { databasePool, isDatabaseConfigured } from "../db/pool.ts";
import { getMandateById } from "../trading/tradingPage.ts";
import { processMockPlanDrivenRoi } from "./inMemoryFinancialMock.ts";
import { getMailDeliveryStatus, enqueueMailEvent } from "./mailOutbox.ts";

type Inv = {
  id: string;
  user_id: string;
  email: string;
  name: string;
  email_alerts: boolean;
  plan_id: string | null;
  principal: string | number;
  started_at: Date | string;
  matures_at: Date | string | null;
  plan_snapshot: Record<string, unknown> | null;
  db_plan_name: string | null;
  db_daily_rate_pct: string | number | null;
  db_duration_days: number | null;
  db_plan_data: Record<string, unknown> | null;
};

export interface RoiRunSummary {
  mode: "database" | "in-memory-mock";
  processed: number;
  payoutsCreated: number;
  totalPaidUsd: number;
  emailsSent: number;
  emailsFailed: number;
}

const day = (v: Date | string) => {
  const d = new Date(v);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const keyDate = (d: Date) => d.toISOString().slice(0, 10);

function freq(v: unknown): "daily" | "weekly" | "monthly" | "maturity" | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (s.includes("matur") || s.includes("end of term")) return "maturity";
  if (s.includes("weekly")) return "weekly";
  if (s.includes("monthly")) return "monthly";
  if (s.includes("daily") || s === "") return "daily";
  return null;
}

function due(f: "daily" | "weekly" | "monthly" | "maturity", start: Date, today: Date, matured: boolean) {
  if (matured) return true;
  if (f === "maturity") return false;
  const n = Math.floor((today.getTime() - start.getTime()) / 86400000);
  if (f === "daily") return n >= 1;
  if (f === "weekly") return n > 0 && n % 7 === 0;
  return today.getUTCDate() === start.getUTCDate() && today > start;
}

export async function processPlanDrivenRoi(asOf = new Date()): Promise<RoiRunSummary> {
  const today = day(asOf);
  const reportDate = keyDate(today);

  if (!isDatabaseConfigured || !databasePool) {
    const payouts = processMockPlanDrivenRoi(asOf);
    const byUser = new Map<string, { email: string; name: string; emailAlerts: boolean; total: number }>();
    let totalPaidUsd = 0;
    for (const p of payouts) {
      totalPaidUsd = Number((totalPaidUsd + p.amount).toFixed(2));
      const existing = byUser.get(p.userId);
      if (existing) {
        existing.total = Number((existing.total + p.amount).toFixed(2));
      } else {
        byUser.set(p.userId, { email: p.email, name: p.name, emailAlerts: p.emailAlerts, total: p.amount });
      }
    }
    let emailsSent = 0;
    let emailsFailed = 0;
    for (const [userId, info] of byUser.entries()) {
      if (!info.emailAlerts) continue;
      try {
        const sent = await enqueueMailEvent({
          eventType: "daily_roi",
          userId,
          recipient: info.email,
          values: {
            firstName: info.name.trim().split(/\s+/)[0] || "Investor",
            amount: info.total.toFixed(2),
            reportDate,
          },
        });
        if (sent) emailsSent++;
        else emailsFailed++;
      } catch (e) {
        emailsFailed++;
        console.error("Mock ROI payout email failed", userId, e);
      }
    }
    return {
      mode: "in-memory-mock",
      processed: payouts.length,
      payoutsCreated: payouts.length,
      totalPaidUsd,
      emailsSent,
      emailsFailed,
    };
  }

  const accrualDate = new Date(today.getTime() - 86400000);
  const result = await databasePool.query<Inv>(
    `SELECT i.id, i.user_id, u.email, u.name,
            COALESCE(up.email_alerts, true) AS email_alerts,
            i.plan_id, i.principal,
            COALESCE(i.started_at, i.created_at) AS started_at,
            i.matures_at,
            i.plan_snapshot,
            p.name AS db_plan_name,
            p.daily_rate_pct AS db_daily_rate_pct,
            p.duration_days AS db_duration_days,
            p.plan_data AS db_plan_data
     FROM investments i
     JOIN "user" u ON u.id = i.user_id
     LEFT JOIN user_profiles up ON up.user_id = i.user_id
     LEFT JOIN investment_plans p ON p.id = i.plan_id
     WHERE i.status = 'active'
       AND i.currency = 'USD'
     ORDER BY COALESCE(i.started_at, i.created_at)`
  );

  const userPayouts = new Map<string, { email: string; name: string; emailAlerts: boolean; paid: number }>();
  let payoutsCreated = 0;
  let totalPaidUsd = 0;

  for (const inv of result.rows) {
    const snap = inv.plan_snapshot ?? {};
    const dbData = inv.db_plan_data ?? {};
    const mandate = getMandateById(inv.plan_id ?? String(snap.mandateId ?? ""));
    const rate = Number(snap.dailyRatePct ?? inv.db_daily_rate_pct ?? mandate?.dailyRatePct ?? 0);
    const principal = Number(inv.principal);
    const durationDays = Math.max(1, Number(snap.durationDays ?? inv.db_duration_days ?? mandate?.durationDays ?? 30));
    const f = freq(snap.paymentFrequency ?? dbData.paymentFrequency ?? mandate?.paymentFrequency);
    const planName = String(snap.name ?? snap.planName ?? inv.db_plan_name ?? mandate?.name ?? "Investment");
    const start = day(inv.started_at);
    const maturity = inv.matures_at
      ? day(inv.matures_at)
      : new Date(start.getTime() + durationDays * 86400000);

    if (!Number.isFinite(rate) || rate <= 0 || rate > 100 || principal <= 0 || !f) {
      console.warn("ROI skipped: unsupported or incomplete plan terms", {
        investmentId: inv.id,
        rate,
        principal,
        paymentFrequency: snap.paymentFrequency ?? dbData.paymentFrequency ?? mandate?.paymentFrequency ?? null,
      });
      continue;
    }

    let paid: number | null = null;
    const client = await databasePool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["roi:" + inv.id]);
      const locked = await client.query("SELECT status FROM investments WHERE id=$1 FOR UPDATE", [inv.id]);
      if (!locked.rows[0] || locked.rows[0].status !== "active") {
        await client.query("COMMIT");
        continue;
      }

      if (accrualDate >= start && accrualDate < maturity) {
        const value = Number(((principal * rate) / 100).toFixed(2));
        await client.query(
          `INSERT INTO roi_accruals(investment_id,user_id,accrual_date,amount,currency)
           SELECT $1,$2,series.day::date,$6,'USD'
           FROM generate_series($3::date,LEAST($4::date,$5::date-1),interval '1 day') AS series(day)
           ON CONFLICT(investment_id,accrual_date) DO NOTHING`,
          [inv.id, inv.user_id, keyDate(start), keyDate(accrualDate), keyDate(maturity), value]
        );
      }

      const matured = today >= maturity;
      if (due(f, start, today, matured)) {
        const sum = await client.query(
          "SELECT COALESCE(SUM(amount),0)::numeric(20,2) AS total FROM roi_accruals WHERE investment_id=$1 AND paid_at IS NULL",
          [inv.id]
        );
        const amount = Number(sum.rows[0]?.total ?? 0);
        if (amount > 0) {
          const txid = randomUUID();
          const idem = "roi:" + inv.id + ":" + reportDate;
          const ref = "ROI-" + inv.id.slice(-8).toUpperCase() + "-" + reportDate.replace(/-/g, "");
          const ins = await client.query(
            `INSERT INTO transactions(id,user_id,type,amount,currency,method,destination,reference,status,idempotency_key,metadata)
             VALUES($1,$2,'return',$3,'USD',$4,$5,$6,'completed',$7,$8::jsonb)
             ON CONFLICT(idempotency_key) DO NOTHING RETURNING id`,
            [
              txid,
              inv.user_id,
              amount,
              `${planName} ROI`,
              inv.id,
              ref,
              idem,
              JSON.stringify({
                investmentId: inv.id,
                planId: inv.plan_id,
                planName,
                payoutFrequency: f,
                periodEnd: reportDate,
                engine: "plan-driven-roi-v2",
              }),
            ]
          );
          if (ins.rowCount) {
            await client.query(
              `INSERT INTO wallets(user_id,currency,available_balance)
               VALUES($1,'USD',$2)
               ON CONFLICT(user_id,currency) DO UPDATE
                 SET available_balance=wallets.available_balance+EXCLUDED.available_balance,updated_at=now()`,
              [inv.user_id, amount]
            );
            await client.query(
              `INSERT INTO ledger_entries(transaction_id,user_id,account_code,direction,amount,currency,memo)
               VALUES($1,$2,'platform_custody','debit',$3,'USD','Plan ROI payout'),
                     ($1,$2,'customer_available','credit',$3,'USD','Plan ROI payout')`,
              [txid, inv.user_id, amount]
            );
            await client.query(
              "UPDATE roi_accruals SET payout_transaction_id=$2,paid_at=now() WHERE investment_id=$1 AND paid_at IS NULL",
              [inv.id, txid]
            );
            await client.query(
              "INSERT INTO notifications(id,user_id,category,title,body) VALUES($1,$2,'investment','Investment return credited',$3)",
              [randomUUID(), inv.user_id, `USD ${amount.toFixed(2)} credited from ${planName}`]
            );
            paid = amount;
          }
        }
      }

      if (matured) {
        await client.query("UPDATE investments SET status='completed',updated_at=now() WHERE id=$1 AND status='active'", [inv.id]);
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error("ROI engine processing failed", inv.id, e);
    } finally {
      client.release();
    }

    if (paid !== null) {
      payoutsCreated++;
      totalPaidUsd = Number((totalPaidUsd + paid).toFixed(2));
      const existing = userPayouts.get(inv.user_id);
      if (existing) {
        existing.paid = Number((existing.paid + paid).toFixed(2));
      } else {
        userPayouts.set(inv.user_id, {
          email: inv.email,
          name: inv.name,
          emailAlerts: inv.email_alerts,
          paid,
        });
      }
    }
  }

  let emailsSent = 0;
  let emailsFailed = 0;

  for (const [userId, info] of userPayouts.entries()) {
    if (!info.emailAlerts) continue;

    // Claim daily_roi_email_runs for today so repeated or scheduled runs never duplicate once sent,
    // while failed sends are recorded cleanly for the 15-minute retry scheduler.
    const claim = await databasePool.query(
      `INSERT INTO daily_roi_email_runs (user_id, report_date, status)
       VALUES ($1, $2::date, 'pending')
       ON CONFLICT (user_id, report_date) DO UPDATE
         SET status = 'pending', last_error = NULL
       WHERE daily_roi_email_runs.status = 'failed'
       RETURNING user_id`,
      [userId, reportDate]
    );
    if (!claim.rowCount) continue;

    try {
      const sent = await enqueueMailEvent({
        eventType: "daily_roi",
        userId,
        recipient: info.email,
        values: {
          firstName: info.name.trim().split(/\s+/)[0] || "Investor",
          amount: info.paid.toFixed(2),
          reportDate,
        },
      });
      if (!sent) {
        const delivery = getMailDeliveryStatus();
        throw new Error(
          delivery.configured
            ? "Daily ROI email template is disabled."
            : `Resend is not configured (missing ${delivery.missingKeys.join(", ")}).`
        );
      }
      await databasePool.query(
        `UPDATE daily_roi_email_runs
         SET status = 'sent', sent_at = now(), last_error = NULL
         WHERE user_id = $1 AND report_date = $2::date`,
        [userId, reportDate]
      );
      emailsSent++;
    } catch (e) {
      emailsFailed++;
      const message = e instanceof Error ? e.message.slice(0, 1000) : "Unknown ROI email error";
      await databasePool
        .query(
          `UPDATE daily_roi_email_runs
           SET status = 'failed', last_error = $3
           WHERE user_id = $1 AND report_date = $2::date`,
          [userId, reportDate, message]
        )
        .catch(() => undefined);
      console.error("ROI payout email failed", userId, message);
    }
  }

  return {
    mode: "database",
    processed: result.rows.length,
    payoutsCreated,
    totalPaidUsd,
    emailsSent,
    emailsFailed,
  };
}

export function startPlanDrivenRoiEngine() {
  if (process.env.PLAN_DRIVEN_ROI_ENABLED === "false") {
    console.info("Plan-driven ROI engine disabled by configuration.");
    return;
  }
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await processPlanDrivenRoi();
    } catch (e) {
      console.error("ROI engine run failed", e);
    } finally {
      running = false;
    }
  };
  const now = new Date();
  const next = new Date();
  next.setUTCHours(0, 10, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  // Catch up any missed accruals shortly after server start, then run every 15 minutes and at 00:10 UTC.
  setTimeout(() => void run(), 4000);
  setTimeout(() => {
    void run();
    setInterval(() => void run(), 86400000);
  }, next.getTime() - now.getTime());
  setInterval(() => void run(), 900000);
  console.info("Plan-driven ROI engine scheduled at 00:10 UTC (with startup & 15-minute catch-up).");
}