import { Injectable, Logger } from '@nestjs/common';
import { APP } from '@kapara/config';
import { env, mailConfigured } from '../common/env';

const COPY: Record<string, (code: string) => { subject: string; text: string }> = {
  fr: (c) => ({ subject: `Ton code ${APP.name} : ${c}`, text: `Ton code de connexion ${APP.name} est ${c}.\nIl expire dans 10 minutes. Si tu n’as rien demandé, ignore ce message.` }),
  en: (c) => ({ subject: `Your ${APP.name} code: ${c}`, text: `Your ${APP.name} sign-in code is ${c}.\nIt expires in 10 minutes. If you didn’t ask for it, ignore this email.` }),
  he: (c) => ({ subject: `הקוד שלך ל־${APP.name}: ${c}`, text: `קוד הכניסה שלך ל־${APP.name} הוא ${c}.\nהקוד בתוקף ל־10 דקות. אם לא ביקשת אותו, אפשר להתעלם מההודעה.` }),
};

/** Sends sign-in codes through Resend's HTTP API. Never logs addresses or codes. */
@Injectable()
export class Mailer {
  private readonly log = new Logger(Mailer.name);
  get configured() { return mailConfigured(); }

  async sendOtp(to: string, code: string, locale = 'fr'): Promise<void> {
    const { subject, text } = (COPY[locale.slice(0, 2)] ?? COPY.fr!)(code);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env().RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env().MAIL_FROM, to: [to], subject, text }),
    });
    if (!res.ok) {
      this.log.error({ status: res.status }, 'otp_email_failed');
      throw new Error('email_delivery_failed');
    }
  }
}
