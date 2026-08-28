create index profiles_role_verified_by_idx
on public.profiles(role_verified_by)
where role_verified_by is not null;
