alter table public.channel_watches drop constraint channel_watches_channel_ref_check;
alter table public.channel_watches add constraint channel_watches_channel_ref_check check (length(channel_ref) between 2 and 110);
