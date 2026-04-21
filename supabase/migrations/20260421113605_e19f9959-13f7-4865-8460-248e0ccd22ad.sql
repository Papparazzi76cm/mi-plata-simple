ALTER TABLE public.monthly_budget
ADD COLUMN IF NOT EXISTS savings_goal numeric NOT NULL DEFAULT 0;