-- F18: bound account-scoped creation so direct Data API calls and concurrent
-- requests cannot create unlimited unfinished listings or saved searches.
--
-- These are launch abuse ceilings, not paid-plan entitlements. Published,
-- rented and expired listing history does not consume the unfinished-listing
-- allowance; a future billing/plan layer can add separate commercial quotas.

create or replace function private.enforce_unfinished_property_quota()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  unfinished_count integer;
begin
  -- Administrative/server maintenance without an end-user JWT is outside this
  -- account quota. Normal API callers still pass the existing INSERT RLS policy.
  if actor is null then
    return new;
  end if;

  if new.owner_id <> actor then
    return new;
  end if;

  if new.status not in (
    'draft'::public.listing_status,
    'rejected'::public.listing_status,
    'pending_review'::public.listing_status
  ) then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('nearbasha:unfinished-property-create:' || actor::text, 0)
  );

  select count(*)::integer
  into unfinished_count
  from public.properties property
  where property.owner_id = actor
    and property.status in (
      'draft'::public.listing_status,
      'rejected'::public.listing_status,
      'pending_review'::public.listing_status
    );

  if unfinished_count >= 25 then
    raise exception 'Property draft limit reached. Finish or remove an existing draft before creating another';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_unfinished_property_quota() from public;
revoke all on function private.enforce_unfinished_property_quota() from anon, authenticated;

drop trigger if exists properties_enforce_unfinished_quota on public.properties;
create trigger properties_enforce_unfinished_quota
before insert on public.properties
for each row execute function private.enforce_unfinished_property_quota();

create or replace function private.enforce_saved_search_quota()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  saved_search_count integer;
begin
  if actor is null then
    return new;
  end if;

  if new.user_id <> actor then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('nearbasha:saved-search-create:' || actor::text, 0)
  );

  select count(*)::integer
  into saved_search_count
  from public.saved_searches saved_search
  where saved_search.user_id = actor;

  if saved_search_count >= 50 then
    raise exception 'Saved search limit reached. Remove an existing saved search before creating another';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_saved_search_quota() from public;
revoke all on function private.enforce_saved_search_quota() from anon, authenticated;

drop trigger if exists saved_searches_enforce_quota on public.saved_searches;
create trigger saved_searches_enforce_quota
before insert on public.saved_searches
for each row execute function private.enforce_saved_search_quota();
