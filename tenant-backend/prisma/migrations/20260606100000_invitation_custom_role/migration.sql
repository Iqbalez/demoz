-- Add optional custom role assignment to pending invitations
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "customRoleId" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invitations_customRoleId_fkey'
  ) THEN
    ALTER TABLE "invitations"
      ADD CONSTRAINT "invitations_customRoleId_fkey"
      FOREIGN KEY ("customRoleId") REFERENCES "custom_roles"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
