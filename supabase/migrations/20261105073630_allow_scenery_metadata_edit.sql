-- 既存のUPDATEポリシーで許可済みの作成者本人に限定。
-- 動画ID・URL・作成者・作成日時にはUPDATEを付与しない。
grant update (title, notes) on public.camera_submissions to authenticated;
