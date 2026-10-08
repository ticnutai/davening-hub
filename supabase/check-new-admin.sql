-- READ ONLY. Run only in project akmafwvxecexweqktgmw SQL Editor.
SELECT u.email, r.role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE lower(u.email) = 'jj1212t@gmail.com';

SELECT to_regclass('public.communities') AS communities,
       to_regclass('public.tv_config') AS tv_config;
