-- Budgets per user per category (string id from src/lib/categories.ts)
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id)
);

-- Enable Row Level Security
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their budgets"
ON public.budgets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert their budgets"
ON public.budgets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their budgets"
ON public.budgets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete their budgets"
ON public.budgets FOR DELETE
USING (auth.uid() = user_id);

-- Reuse the timestamp updater pattern (create function if missing)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_budgets_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_budgets_user ON public.budgets(user_id);