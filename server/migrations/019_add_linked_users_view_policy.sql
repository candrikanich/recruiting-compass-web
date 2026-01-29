-- Allow users to view profiles of accounts they are linked to
-- This enables the account-linking feature to fetch user details of linked family members

-- Add policy: Users can view profiles of users they have an accepted account link with
CREATE POLICY "Users can view linked family members" ON public.users
FOR SELECT
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.account_links
    WHERE status = 'accepted'
    AND (
      (initiator_user_id = auth.uid() AND (parent_user_id = users.id OR player_user_id = users.id))
      OR (parent_user_id = auth.uid() AND player_user_id = users.id)
      OR (player_user_id = auth.uid() AND parent_user_id = users.id)
    )
  )
);
