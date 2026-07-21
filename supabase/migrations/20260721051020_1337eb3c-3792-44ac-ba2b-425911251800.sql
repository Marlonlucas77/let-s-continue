
DELETE FROM public.subscriptions WHERE stripe_subscription_id IS NULL;
DROP INDEX IF EXISTS public.subscriptions_stripe_subscription_id_key;
ALTER TABLE public.subscriptions ALTER COLUMN stripe_subscription_id SET NOT NULL;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);
ALTER TABLE public.subscriptions ALTER COLUMN environment SET DEFAULT 'live';
