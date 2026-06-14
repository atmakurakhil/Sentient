
-- Restrict collaborator email visibility
DROP POLICY IF EXISTS collab_select_visible ON public.map_collaborators;

CREATE POLICY collab_select_owner_all
ON public.map_collaborators
FOR SELECT
USING (public.user_owns_map(map_id));

CREATE POLICY collab_select_self_row
ON public.map_collaborators
FOR SELECT
USING (lower(user_email) = lower(public.current_user_email()));

-- Token-based public access for shared maps
DROP POLICY IF EXISTS saved_maps_select_public_token ON public.saved_maps;
CREATE POLICY saved_maps_select_public_token
ON public.saved_maps
FOR SELECT
TO anon, authenticated
USING (
  share_enabled = true
  AND share_token IS NOT NULL
  AND share_token::text = current_setting('request.headers', true)::json->>'x-share-token'
);
