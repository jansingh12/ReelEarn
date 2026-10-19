-- Run once in Supabase > SQL Editor (safe to repeat).
-- Step 11 (date of birth): the server works out the age. Under 18 = the brand-new account is deleted and 'underage' is returned.
create or replace function public.submit_dob(p_dob date) returns text
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid(); age int;
begin
  if uid is null then raise exception 'Please log in again.'; end if;
  if p_dob is null or p_dob > current_date or p_dob < date '1900-01-01' then raise exception 'Enter a valid date of birth.'; end if;
  age := extract(year from age(current_date, p_dob))::int;
  if age < 18 then
    delete from auth.users where id = uid;   -- cascades to profile and private state
    return 'underage';
  end if;
  insert into public.user_state (id, state) values (uid, jsonb_build_object('dob', p_dob))
  on conflict (id) do update set state = public.user_state.state || jsonb_build_object('dob', p_dob), updated_at = now();
  return 'ok';
end $$;
grant execute on function public.submit_dob(date) to authenticated;
revoke execute on function public.submit_dob(date) from anon;
