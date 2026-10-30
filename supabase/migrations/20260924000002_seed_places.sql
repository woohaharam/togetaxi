insert into public.places (university_id, name, sort)
select u.id, p.name, p.sort
from public.universities u
cross join (values
  ('동국대 WISE 정문', 1),
  ('동국대 WISE 기숙사', 2),
  ('신경주역', 3),
  ('경주고속버스터미널', 4),
  ('경주시외버스터미널', 5),
  ('황리단길', 6),
  ('보문관광단지', 7),
  ('포항경주공항', 8)
) as p (name, sort)
where u.name = '동국대학교' and u.campus = 'WISE캠퍼스';
