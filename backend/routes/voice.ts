import { Hono } from 'hono';
import twilio from 'twilio';
import { config } from '@/backend/config/env';
import { sendGridService } from '@/backend/lib/sendgrid';

const voice = new Hono();

function getTwilioClient() {
  if (!config.twilio) throw new Error('Twilio not configured');
  return twilio(config.twilio.accountSid, config.twilio.authToken);
}

const approvedScript =
  'Hello, this is RevoVend. A remote vendor is interested in purchasing a table space at your event. Press 1 to hear more now and receive details by email. Press 2 to receive details by email only. Press 3 to decline and be removed. Thank you.';

voice.post('/initiate', async (c) => {
  try {
    const body = await c.req.json<{ toPhone: string; toEmail?: string; eventTitle: string; eventDate: string }>();
    const { toPhone, toEmail, eventTitle, eventDate } = body;
    const client = getTwilioClient();

    const baseUrl = config.apiBaseUrl.replace(/\/$/, '');
    const call = await client.calls.create({
      to: toPhone,
      from: config.twilio!.phoneNumber,
      url: `${baseUrl}/voice/ivr?eventTitle=${encodeURIComponent(eventTitle)}&eventDate=${encodeURIComponent(eventDate)}&toEmail=${encodeURIComponent(toEmail ?? '')}`,
      statusCallback: `${baseUrl}/voice/status`,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'] as any,
    } as any);

    return c.json({ success: true, sid: call.sid });
  } catch (err: any) {
    console.error('[Voice:initiate] Error', err);
    return c.json({ success: false, error: err?.message ?? 'Failed to initiate call' }, 500);
  }
});

voice.get('/ivr', async (c) => {
  try {
    const eventTitle = c.req.query('eventTitle') ?? '';
    const eventDate = c.req.query('eventDate') ?? '';
    const toEmail = c.req.query('toEmail') ?? '';

    const response = new twilio.twiml.VoiceResponse();
    const gather = response.gather({ input: 'dtmf', numDigits: 1, timeout: 6, action: `/voice/handle-input?eventTitle=${encodeURIComponent(eventTitle)}&eventDate=${encodeURIComponent(eventDate)}&toEmail=${encodeURIComponent(toEmail)}`, method: 'POST' });
    gather.say({ voice: 'Polly.Joanna' as any }, approvedScript);
    response.say({ voice: 'Polly.Joanna' as any }, 'We did not receive any input. Goodbye.');

    c.header('Content-Type', 'text/xml');
    return c.body(response.toString());
  } catch (err: any) {
    console.error('[Voice:ivr] Error', err);
    return c.body('<Response><Say>System error. Goodbye.</Say></Response>', 500);
  }
});

voice.post('/handle-input', async (c) => {
  try {
    const form = await c.req.parseBody();
    const digits = (form.Digits as string | undefined) ?? '';
    const eventTitle = c.req.query('eventTitle') ?? '';
    const eventDate = c.req.query('eventDate') ?? '';
    const toEmail = c.req.query('toEmail') ?? '';

    const response = new twilio.twiml.VoiceResponse();

    if (digits === '1' || digits === '2') {
      const subject = digits === '1'
        ? 'RevoVend: You expressed interest — vendor table details inside'
        : 'RevoVend: Vendor table opportunity — details inside';
      const bodyText = digits === '1'
        ? `Thanks for your interest! A RevoVend vendor would like to purchase a table at your upcoming event. This is a great opportunity for you to make extra earnings at your event by allowing non-local vendors to set up space at your event. We’ll share details and next steps, including the invitation code to connect in the RevoVend app. If you have questions, reply to this email.`
        : `A RevoVend vendor would like to purchase a table at your upcoming event. We’re sharing details and next steps, including the invitation code to connect in the RevoVend app. If you have questions, reply to this email.`;

      if (toEmail && sendGridService.isReady()) {
        await sendGridService.sendEmail({ to: toEmail, subject, text: bodyText, html: bodyText.replace(/\n/g, '<br/>') });
      }

      response.say({ voice: 'Polly.Joanna' as any }, digits === '1' ? 'Great. We sent the details by email and will follow up shortly. Goodbye.' : 'Understood. We sent the details by email. Goodbye.');
      response.hangup();
    } else if (digits === '3') {
      response.say({ voice: 'Polly.Joanna' as any }, 'You have been removed. Thank you for your time. Goodbye.');
      response.hangup();
    } else {
      const gather = response.gather({ input: 'dtmf', numDigits: 1, timeout: 6, action: `/voice/handle-input?eventTitle=${encodeURIComponent(eventTitle)}&eventDate=${encodeURIComponent(eventDate)}&toEmail=${encodeURIComponent(toEmail)}`, method: 'POST' });
      gather.say({ voice: 'Polly.Joanna' as any }, 'Sorry, I did not get that. Press 1 to hear more and receive email, press 2 to receive email only, press 3 to decline.');
      response.say({ voice: 'Polly.Joanna' as any }, 'No input received. Goodbye.');
    }

    c.header('Content-Type', 'text/xml');
    return c.body(response.toString());
  } catch (err: any) {
    console.error('[Voice:handle-input] Error', err);
    return c.body('<Response><Say>System error. Goodbye.</Say></Response>', 500);
  }
});

voice.post('/status', async (c) => {
  try {
    const body = await c.req.parseBody();
    console.log('[Voice:status]', body);
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: true });
  }
});

export default voice;
