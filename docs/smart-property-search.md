# Smarter property search and matching

## Problem and plan

Recommended search previously ordered by renter compatibility and distance on
the server, while the map sent no soft renter preference and sorted the returned
200 homes by distance again. For map users, Recommended effectively duplicated
Nearest.

1. Keep area, tenant policy, rent and bedroom requirements as hard filters.
2. Rank all eligible homes in PostgreSQL before the response cap.
3. Preserve this order in the browser and explain it in English and Bangla.
4. Verify boundary cases and existing sort modes before rollout.

## Algorithm

Use an explainable weighted utility score within the existing compatibility
tiers (compatible, unspecified, incompatible when a soft preference is supplied).
The map's explicitly selected tenant type remains a hard requirement.

| Signal | Weight | Utility |
| --- | ---: | --- |
| Distance | 0.60 | `1 / (1 + distance_meters / 2000)` |
| Budget headroom | 0.25 | `(max_rent - rent) / (max_rent - min_rent)` clamped to 0–1 |
| Confirmed availability | 0.15 | `1 / (1 + days_since_confirmation / 7)` |

Missing minimum rent means zero. Budget utility is zero when maximum rent is
absent, rent is unknown, or the budget bounds are equal. An exact-price search
therefore stays valid. No budget means no inferred preference for cheap homes.
Missing confirmation contributes zero; future confirmation timestamps are
clamped to age zero. Editing a title cannot refresh the freshness signal.
These are initial product weights, not a trained model or a predicted match
probability. No behavioural tracking, demographic inference, paid ranking or
external AI service is introduced.

Fixed distance and age scales avoid ranks shifting simply because radius changes
or an outlier appears. A ~660m home at BDT 10,000 confirmed today can outrank a
30m home at BDT 30,000 confirmed 30 days ago within a BDT 5,000–35,000 budget.
Without a maximum budget, only distance and confirmation affect the score.

Tie breakers remain distance, update time and UUID. Distance and both price
sorts keep their existing behaviour. Radius and polygon searches share the
same scoring stage. Counts still include all eligible homes and the response
is capped at 200. The RPC signature and return shape are unchanged.

## Data boundary and cost

The existing public search function intentionally uses SECURITY DEFINER to
return a curated projection of published, available, unexpired homes. Its
empty search path, explicit role grants, location rounding and eligibility
predicates are retained. The Supabase advisor already flags this intentional
public access; this change adds no public endpoints or privileges. See the
[advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

Scoring adds constant work per eligible home. The existing window ranking remains
O(n log n); this is not a claim of improved query latency. PostGIS membership
filters still run before ranking. Benchmark dense 100km queries with EXPLAIN
(ANALYZE, BUFFERS) in staging before large-scale rollout. Retain the current
radius/polygon limits; do not rank only a pre-limited nearest subset.

## Validation and rollout

- `npm run smartsearchqa`: executes the browser sort with conflicting recommendation,
  distance and price orders; checks missing prices and input immutability.
- `supabase/tests/f28_smart_property_recommendations.sql`: executes the migrated
  function against session-local copies of the listing tables. Fixtures and
  functions are rolled back; no real listings are modified. Covers >200 matches,
  budget/freshness ranking, polygons, hard filters, missing inputs, tie breaking,
  expired/unpublished exclusion, and legacy/price sorts. CI runs it after migrations.
- Retain the existing F08/F09 compatibility and F10 polygon regression tests.
- Run typecheck, lint, localization, search-state, map-search and production build.

Deploy the migration before or alongside the UI. Until the UI is deployed, its
old distance re-sort will hide the new recommendation order. The UI remains
compatible with the previous database but will use its old recommendation logic.
No generated type update is required because the API shape is unchanged.
For rollback, restore the search function definition from migration
`20260911040000_server_side_polygon_search.sql` without its obsolete DROP
statement, and revert the UI explanation/order change.

Next, validate these weights with renter feedback and consented aggregate search
outcomes before tuning. Commute routing, semantic text search and learned
personalization are separate future features; this change does not claim them.
