const EMAIL_LOGO_URL = "https://bitfurytech.cloud/images/brand/bitfurylogo.png";

/** Extract the supplied message body so every Resend email gets one consistent shell. */
function extractEmailContent(html: string): string {
  return html
    .replace(/^\\s*<!doctype[^>]*>/i, "")
    .replace(/^\\s*<html[^>]*>/i, "")
    .replace(/<\\/html>\\s*$/i, "")
    .replace(/<head[^>]*>[\\s\\S]*?<\\/head>/i, "")
    .replace(/<body[^>]*>/i, "")
    .replace(/<\\/body>/i, "")
    .replace(/<a\\b([^>]*)>/gi, (_match, attributes: string) => {
      if (/\\bstyle\\s*=/i.test(attributes)) return `<a${attributes}>`;
      return `<a${attributes} style="color:#3F8A3F;">`;
    })
    .trim();
}

/** Shared table-based, inline-CSS email layout for Gmail, Outlook and Apple Mail. */
export function renderBrandedEmail(contentHtml: string): string {
  const content = extractEmailContent(contentHtml);
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background-color:#F4F5F7;font-family:Arial,Helvetica,sans-serif;color:#202124;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;background-color:#F4F5F7;">
      <tr>
        <td align="center" style="padding:32px 12px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="width:100%;max-width:520px;border-collapse:separate;">
            <tr>
              <td align="center" style="padding:0 0 24px;">
                <img src="${EMAIL_LOGO_URL}" width="220" alt="Bitfury Tech Investment" style="display:block;width:220px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;">
              </td>
            </tr>
            <tr>
              <td style="background-color:#FFFFFF;border-top:4px solid #5FA55A;border-radius:8px;padding:40px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#202124;">
                <div style="font-family:Arial,Helvetica,sans-serif;color:#202124;">${content}</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#9CA3AF;">
                © Bitfury Tech Investment
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

