-- 가입할 때 약관·개인정보·만 14세 이상에 동의한 시각을 남긴다.
-- 세 항목 모두 체크해야 가입 화면의 버튼이 눌리므로, 이 시각이 곧 동의 기록이다.
alter table public.profiles add column agreed_at timestamptz not null default now();
