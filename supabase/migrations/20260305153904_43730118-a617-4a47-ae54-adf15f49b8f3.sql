
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_id uuid;
  _loc_id uuid;
  _org_name text;
  _facility_name text;
  _slug text;
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'caregiver');

  _org_name := NEW.raw_user_meta_data->>'org_name';
  _facility_name := NEW.raw_user_meta_data->>'facility_name';

  IF _org_name IS NOT NULL AND _org_name <> '' THEN
    _slug := lower(regexp_replace(_org_name, '[^a-zA-Z0-9]+', '-', 'g'));
    
    INSERT INTO public.organizations (name, slug, owner_id)
    VALUES (_org_name, _slug || '-' || substr(gen_random_uuid()::text, 1, 8), NEW.id)
    RETURNING id INTO _org_id;

    UPDATE public.profiles SET org_id = _org_id WHERE user_id = NEW.id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');

    INSERT INTO public.org_memberships (user_id, org_id, role)
    VALUES (NEW.id, _org_id, 'admin');

    IF _facility_name IS NOT NULL AND _facility_name <> '' THEN
      INSERT INTO public.locations (name, org_id)
      VALUES (_facility_name, _org_id)
      RETURNING id INTO _loc_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
