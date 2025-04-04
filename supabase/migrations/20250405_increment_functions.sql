
-- Function to increment a numeric value
CREATE OR REPLACE FUNCTION public.increment(value integer DEFAULT 1)
 RETURNS integer
 LANGUAGE sql
AS $function$
  SELECT $1 + 1
$function$;

-- Function to increment post likes
CREATE OR REPLACE FUNCTION public.increment_post_likes(post_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.posts
  SET likes = likes + 1
  WHERE id = post_id;
END;
$function$;
