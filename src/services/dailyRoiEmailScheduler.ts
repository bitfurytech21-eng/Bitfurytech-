import { queryDatabase } from "../db/pool.ts";
import { enqueueMailEvent } from "./mailOutbox.ts";

type DailyReturnRow = {
  user_id: string;
  email: string;
  name: string;
  total_return: string | number;
};

/**
 * Emails a daily summary only for completed return transactions already posted
 * to the ledger. It does not calculate, accrue, approve, or credit investment returns.
 * A per-user/per-day database key makes repeated scheduler runs safe.
 */
export async function sendDailyRecordedReturnSummaries(reportDate: string): Promise<void> {
  const rows = await queryDatabase<DailyReturnRow>(
    `SELECT t.user_id, u.email, u.name,
            SUM(t.amount)::numeric(20,2) AS total_return
     FROM transactions t
     JOIN "user" u ON u.id = t.user_id
     WHERE t.type = 'return'
       AND t.status = 'completed'
       AND t.currency = 'USD'
       AND (t.created_at AT TIME ZONE 'UTC')::date = $1::date
     GROUP BY t.user_id, u.email, u.name
     HAVING SUM(t.amount) > 0`,
    [reportDate]
  );

  for (const row of rows.rows) {
    const claim = await queryDatabase(
      `INSERT INTO daily_roi_email_runs (user_id, report_date, status)
       VALUES ($1, $2::date, 'pending')
       ON CONFLICT (user_id, report_date) DO UPDATE
         SET status = 'pending', last_error = NULL
       WHERE daily_roi_email_runs.status = 'failed'
       RETURNING user_id`,
      [row.user_id, reportDate]
    );
    if (!claim.rowCount) continue;

    try {
      const sent = await enqueueMailEvent({
        eventType: "daily_roi",
        userId: row.user_id,
        recipient: row.email,
        values: {
          firstName: row.name.trim().split(/\\s+/)[0] || "Investor",
          amount: Number(row.total_return).toFixed(2),
          reportDate,
        },
      });
      if (!sent) throw new Error("Resend is not configured or daily ROI email template is disabled.");
      await queryDatabase(
        `UPDATE daily_roi_email_runs SET status = 'sent', sent_at = now(), last_error = NULL
         WHERE user_id = $1 AND report_date = $2::date`,
        [row.user_id, reportDate]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown email delivery error";
      await queryDatabase(
        `UPDATE daily_roi_email_runs SET status = 'failed', last_error = $3
         WHERE user_id = $1 AND report_date = $2::date`,
        [row.user_id, reportDate, message]
      );
      console.error("Daily recorded-return email failed", { userId: row.user_id, reportDate, error: message });
    }
  }
}

/** Runs at 08:00 UTC daily and retries failed messages every 15 minutes. */
export function startDailyRoiEmailScheduler(): void {
  if (process.env.DAILY_ROI_EMAILS_ENABLED === "false") {
    console.info("Daily recorded-return email scheduler disabled by configuration.");
    return;
  }

  let running = false;
  const runYesterday = async () => {
    if (running) return;
    running = true;
    try {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      await sendDailyRecordedReturnSummaries(yesterday);
    } catch (error) {
      console.error("Daily recorded-return email scheduler failed:", error);
    } finally {
      running = false;
    }
  };

  const now = new Date();
  const next = new Date();
  next.setUTCHours(8, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  const initialDelay = next.getTime() - now.getTime();

  setTimeout(() => {
    void runYesterday();
    setInterval(() => void runYesterday(), 24 * 60 * 60 * 1000);
  }, initialDelay);

  // Retry failed rows without sending successful user/day pairs again.
  setInterval(() => void runYesterday(), 15 * 60 * 1000);
}
