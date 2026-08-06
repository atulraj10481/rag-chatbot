-- Add is_public_chat_enabled column to settings table
alter table settings
add column if not exists is_public_chat_enabled boolean default true;
