# NearBasha launch readiness

## Engineering release scope
- Canonical public origin is https://rent-home-bd.vercel.app; update the single metadata origin if a custom production domain is assigned.
- Sitemap contains stable public pages only. Preview deployments are noindex and disallow crawling; authentication and private routes are noindex. Faceted map searches are canonicalized to /homes and noindex. Individual listing indexing is deferred until published inventory and expiry handling are verified.
- Public property IDs are checked before the detail RPC. Repeated search parameters are normalized. Login shares the existing safe relative redirect validator.
- Privacy text describes observed application data flows, controlled phone reveal, device location, infrastructure/map providers and manual support requests. Terms provide acceptable-use and reporting guidance. These are not a legal compliance certification.

## Required before public launch (owner/operator)
- Confirm legal operator name, contact details, applicable Bangladesh legal requirements and actual retention/deletion policy with qualified local counsel. Approve the bilingual legal copy before public launch; do not promise deletion deadlines or storage locations that have not been verified.
- Verify account deletion/export operational procedure: who processes support_requests, how identity is verified, how records and backups are handled, and how requests are tracked to resolution. The form is intake, not automatic deletion.
- Complete docs/phone-otp-production.md: verify actual Bangladesh SMS delivery, provider, rate limits, abuse protection and production credentials in dashboard (never in GitHub).
- Confirm service-provider terms, data processing and tile usage limits; choose a production-appropriate tile plan before substantial traffic. Map tiles must retain attribution.
- Recruit real owners and publish genuine moderated listings with consent. Verify populated inventory, location matching, room rent, photo visibility, expiry/relisting and availability updates. Never seed fabricated live listings.
- Use dedicated consented staging renter/owner/moderator accounts to exercise signup, phone verification, listing creation/review, save, message, report/block, role boundaries and deletion/export requests. Do not use real customer accounts or send unsolicited SMS.
- Verify device usability with physical low-end Android and iOS devices on Bangladesh networks. Measure real LCP, INP and CLS; avoid claiming Core Web Vitals compliance from HTTP checks or HTML sizes.
- Configure an error alert destination and a responsible on-call/support owner. Vercel runtime errors and logs can be checked; a log drain or external monitoring destination requires operator approval.
- Establish rollback, database backup/restore and incident procedures. Record the release commit, deployment ID, verification results and open blockers.

## Regression coverage
CI runs database lifecycle, access and abuse tests plus desktop/mobile browser checks. Phase 4 adds rendered metadata, crawler endpoints, invalid listing route, privacy request retry and unauthenticated access checks. Mocked browser responses do not establish actual production SMS, support operations or authenticated transactions.
