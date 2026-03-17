// Resend API wrapper using environment variable RESEND_API_KEY
import { Resend } from "resend";
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  throw new Error("RESEND_API_KEY environment variable is not set");
}
const client = new Resend(apiKey);

export interface EmailParams {
  to: string;
  from?: string;
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmail(params: EmailParams) {
  const payload: any = {
    from: params.from ?? "no-reply@example.com",
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  };
  return await client.emails.send(payload);
}
