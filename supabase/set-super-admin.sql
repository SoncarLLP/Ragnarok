-- ============================================================
-- SONCAR – Promote a member to super_admin
-- ============================================================
--
-- HOW TO USE:
--   1. Open the Supabase dashboard for your project
--   2. Go to SQL Editor
--   3. Replace 'your@email.com' below with the email address of the
--      account you want to make super_admin
--   4. Click Run
--   5. Repeat for your business partner with their email address
--
-- NOTES:
--   - The user must already have an account on the site
--   - super_admins can promote/demote admins but cannot demote other super_admins
--   - To check who your current super_admins are, run the verification query at the bottom
-- ============================================================

update public.profiles
set role = 'super_admin'
where id = (
  select id from auth.users where email = 'your@email.com'
);

-- Verify: show all super_admins after the update
select
  p.member_id,
  u.email,
  p.full_name,
  p.username,
  p.role,
  p.status,
  p.created_at
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'super_admin'
order by p.created_at;
