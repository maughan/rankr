-- Update List.createdById from old createdBy string
UPDATE "List" l
SET "createdById" = u.id
FROM "User" u
WHERE l."createdBy" = u.username;

-- Update Ranking.userId from old user string
UPDATE "Ranking" r
SET "userId" = u.id
FROM "User" u
WHERE r."user" = u.username;

-- Update Item.createdById from old createdBy string
UPDATE "Item" i
SET "createdById" = u.id
FROM "User" u
WHERE i."createdBy" = u.username;