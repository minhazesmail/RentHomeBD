# Production phone OTP checklist

RentHomeBD links a Bangladesh mobile number to an already-authenticated account using Supabase Auth `updateUser({ phone })`, then verifies the SMS code with `verifyOtp({ type: "phone_change" })`.

Public signup/sign-in can also use `signInWithOtp` / `verifyOtp` with type `sms` for phone-first accounts.

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
- Review Authentication → Rate Limits before launch (per-phone and per-IP).

## CAPTCHA / bot protection (required before high traffic)

Automated OTP requests burn SMS budget and can harass phone numbers. Before a public launch:

1. Enable CAPTCHA in Supabase Dashboard → Authentication → Attack Protection (or equivalent) when available for your plan.
2. Or integrate Cloudflare Turnstile (or hCaptcha) on public auth entry points:
   - Login/signup (`AuthForm`) for phone OTP send
   - Phone verification form (`PhoneVerificationForm`) for `updateUser({ phone })`
3. Optional env placeholders (do not commit secrets):

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

4. Verify the Turnstile token server-side before calling Supabase OTP APIs if you add a Route Handler wrapper; never trust the client alone.
5. Keep the existing 60s client cooldown; treat it as UX only.

Until CAPTCHA is live, restrict phone auth to lower environments or tightly rate-limit at the Supabase project level.

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

- Supabase documents a phone-change edge case involving abandoned duplicate `phone_change` values. Before a large production rollout, periodically inspect stale phone-change attempts and follow Supabase's current cleanup guidance rather than adding client-side workarounds.
- **Do not store OTPs** in application tables, logs, analytics events, or error-reporting payloads.
- Do not log full phone numbers in client analytics; prefer masked forms (`+8801••• ••67`).
- Session refresh for protected routes runs in `src/proxy.ts` (Next.js 16 proxy). Page-level `requireUser` remains the authoritative gate.
