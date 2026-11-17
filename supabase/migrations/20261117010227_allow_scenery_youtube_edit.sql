-- The existing owner/admin RLS and canonical URL constraint still apply.
grant update (youtube_video_id, youtube_url) on public.camera_submissions to authenticated;
