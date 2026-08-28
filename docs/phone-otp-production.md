# Production phone OTP checklist

RentHomeBD links a Bangladesh mobile number to an already-authenticated account using Supabase Auth `updateUser({ phone })`, then verifies the SMS code with `verifyOtp({ type: "phone_change" })`.

## Provider boundary

- Configure the SMS provider only in Supabase Dashboard → Authentication → Providers → Phone.
- Never place SMS provider credentials in `NEXT_PUBLIC_*`, client code, GitHub, or browser storage.
- The application needs only the normal Supabase URL and publishable key already used by the rest of the frontend.
- Supabase currently supports providers including Twilio, MessageBird, Vonage, and TextLocal; verify Bangladesh delivery, sender registration, pricing, and local regulatory requirements with the chosen provider before production launch.
- A Supabase Send SMS Hook is an alternative if a Bangladesh-focused provider is needed later; provider secrets should then stay in the hook/Edge Function environment.

## Recommended Auth settings

- Enable Phone authentication only after a production SMS provider is configured.
- Keep OTP length at 6 digits unless there is a reason to increase it.
- Use an OTP validity window appropriate for real mobile delivery; Supabase warns that the 60-second default can be too short in production.
- Keep a resend interval of at least 60 seconds. The UI also applies a 60-second local cooldown, but server-side Supabase rate limits remain authoritative.
- Review Authentication → Rate Limits before launch.
- Add CAPTCHA/Turnstile to public authentication entry points before a high-traffic launch to reduce automated abuse and SMS spend.

## Bangladesh number handling

The app accepts:

- `01XXXXXXXXX`
- `8801XXXXXXXXX`
- `+8801XXXXXXXXX`

and normalizes valid mobile numbers to E.164 form: `+8801XXXXXXXXX`.

The current validator accepts Bangladesh mobile prefixes `013` through `019`.

## Trust semantics

A `Phone verified` badge means Supabase Auth successfully confirmed control of the linked phone number. It does not prove a person's legal identity, address, or ownership of a listed property.

The public UI never exposes the phone number itself. Only the verification timestamp is copied into the safe public listing trust snapshot.

## Security notes

Supabase documents a phone-change edge case involving abandoned duplicate `phone_change` values. Before a large production rollout, periodically inspect stale phone-change attempts and follow Supabase's current cleanup guidance rather than adding client-side workarounds.

Do not store OTPs in application tables, logs, analytics events, or error-reporting payloads.
