-- The seed admin account ("admin") reported losing access to the Admin
-- portal despite still being able to log in — its isAdmin flag had ended up
-- false. This is a one-time, targeted data fix (a no-op if the row is
-- already correct or doesn't exist under this username).
UPDATE "Rep" SET "isAdmin" = true WHERE "username" = 'admin';
