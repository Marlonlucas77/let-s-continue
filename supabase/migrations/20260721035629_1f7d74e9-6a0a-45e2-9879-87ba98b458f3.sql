DELETE FROM public.tracked_leagues WHERE season < 2026;
DELETE FROM public.matches WHERE match_date < '2026-01-01';