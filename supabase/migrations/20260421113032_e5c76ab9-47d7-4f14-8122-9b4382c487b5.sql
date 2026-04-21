CREATE TABLE public.monthly_budget (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  fixed_expenses JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.monthly_budget ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their monthly budget"
  ON public.monthly_budget FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their monthly budget"
  ON public.monthly_budget FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their monthly budget"
  ON public.monthly_budget FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete their monthly budget"
  ON public.monthly_budget FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER monthly_budget_updated_at
  BEFORE UPDATE ON public.monthly_budget
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();