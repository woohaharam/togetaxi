// 커리어넷 학교 목록(korea-universities 패키지)으로 학교 시드 마이그레이션을 만든다.
// 사용법: node scripts/build-universities.mjs > supabase/migrations/<timestamp>_seed_universities.sql
import { getAllUniversities } from "korea-universities";

const EXCLUDED_TYPES = /사이버|원격|방송통신|사내대학/;

const REGION = {
  서울특별시: "서울", 부산광역시: "부산", 대구광역시: "대구", 인천광역시: "인천",
  광주광역시: "광주", 대전광역시: "대전", 울산광역시: "울산", 세종특별자치시: "세종",
  경기도: "경기", 강원특별자치도: "강원", 충청북도: "충북", 충청남도: "충남",
  전북특별자치도: "전북", 전라남도: "전남", 경상북도: "경북", 경상남도: "경남",
  제주특별자치도: "제주",
};

// 같은 학교가 여러 지역에 있을 때 실제로 부르는 캠퍼스 이름
const CAMPUS = {
  "가천대학교|경기": "글로벌캠퍼스",
  "가천대학교|인천": "메디컬캠퍼스",
  "가톨릭대학교|경기": "성심교정",
  "가톨릭대학교|서울": "성의·성신교정",
  "건양대학교|대전": "대전메디컬캠퍼스",
  "건양대학교|충남": "논산캠퍼스",
  "경기대학교|경기": "수원캠퍼스",
  "경기대학교|서울": "서울캠퍼스",
  "경동대학교|경기": "양주캠퍼스",
  "경동대학교|강원": "",
  "경북대학교|대구": "",
  "경북대학교|경북": "상주캠퍼스",
  "경인교육대학교|인천": "인천캠퍼스",
  "경인교육대학교|경기": "경기캠퍼스",
  "경희대학교|서울": "서울캠퍼스",
  "경희대학교|경기": "국제캠퍼스",
  "국립한국교통대학교|충북": "",
  "국립한국교통대학교|경기": "의왕캠퍼스",
  "단국대학교|경기": "죽전캠퍼스",
  "단국대학교|충남": "천안캠퍼스",
  "대경대학교|경북": "",
  "대경대학교|경기": "남양주캠퍼스",
  "대구가톨릭대학교|경북": "",
  "대구가톨릭대학교|대구": "대구캠퍼스",
  "대구대학교|경북": "",
  "대구대학교|대구": "대명캠퍼스",
  "동국대학교|서울": "서울캠퍼스",
  "동국대학교|경기": "바이오메디캠퍼스",
  "동양대학교|경북": "영주캠퍼스",
  "동양대학교|경기": "동두천캠퍼스",
  "부산대학교|부산": "",
  "부산대학교|경남": "양산·밀양캠퍼스",
  "상명대학교|서울": "서울캠퍼스",
  "상명대학교|충남": "천안캠퍼스",
  "서영대학교|광주": "광주캠퍼스",
  "서영대학교|경기": "파주캠퍼스",
  "성균관대학교|서울": "인문사회과학캠퍼스",
  "성균관대학교|경기": "자연과학캠퍼스",
  "세한대학교|전남": "영암캠퍼스",
  "세한대학교|충남": "당진캠퍼스",
  "안양대학교|경기": "",
  "안양대학교|인천": "강화캠퍼스",
  "연세대학교|서울": "신촌캠퍼스",
  "연세대학교|인천": "국제캠퍼스",
  "영남대학교|경북": "",
  "영남대학교|대구": "대명캠퍼스",
  "영산대학교|경남": "양산캠퍼스",
  "영산대학교|부산": "해운대캠퍼스",
  "예원예술대학교|전북": "",
  "예원예술대학교|경기": "양주캠퍼스",
  "우석대학교|전북": "",
  "우석대학교|충북": "진천캠퍼스",
  "유원대학교|충북": "",
  "유원대학교|충남": "아산캠퍼스",
  "을지대학교|대전": "대전캠퍼스",
  "을지대학교|경기": "성남·의정부캠퍼스",
  "인제대학교|경남": "김해캠퍼스",
  "인제대학교|부산": "부산캠퍼스",
  "전남대학교|광주": "광주캠퍼스",
  "전남대학교|전남": "여수캠퍼스",
  "중부대학교|충남": "충청캠퍼스",
  "중부대학교|경기": "고양캠퍼스",
  "중앙대학교|서울": "서울캠퍼스",
  "중앙대학교|경기": "다빈치캠퍼스",
  "청운대학교|충남": "홍성캠퍼스",
  "청운대학교|인천": "인천캠퍼스",
  "한국외국어대학교|서울": "서울캠퍼스",
  "한국외국어대학교|경기": "글로벌캠퍼스",
};

const MULTI_LABEL = [".ac.kr", ".co.kr", ".or.kr", ".go.kr", ".re.kr"];

function domainOf(link) {
  if (!link) return null;
  let host;
  try {
    host = new URL(link).hostname.toLowerCase();
  } catch {
    return null;
  }
  const labels = host.split(".");
  const keep = MULTI_LABEL.some((s) => host.endsWith(s)) ? 3 : 2;
  const domain = labels.slice(-keep).join(".");
  return /\.(ac\.kr|edu)$/.test(domain) ? domain : null;
}

function kindOf(level) {
  if (level === "전문대학") return "전문대";
  if (level === "대학원대학") return "대학원";
  return "4년제";
}

function splitCampus(nameKr) {
  const m = nameKr.match(/^(.*?(?:대학교|대학))\s+(\S+캠퍼스)$/);
  return m ? [m[1], m[2]] : [nameKr, null];
}

const groups = new Map();
for (const u of getAllUniversities()) {
  if (EXCLUDED_TYPES.test(u.type)) continue;
  const region = REGION[u.region];
  if (!region) continue;

  const [name, ownCampus] = splitCampus(u.nameKr.trim());
  const key = `${name}|${ownCampus ?? ""}|${region}`;
  const g = groups.get(key) ?? { name, ownCampus, region, kind: kindOf(u.level), domains: new Set() };
  const domain = domainOf(u.link);
  if (domain) g.domains.add(domain);
  groups.set(key, g);
}

const regionsByName = new Map();
for (const g of groups.values()) {
  if (g.ownCampus) continue;
  regionsByName.set(g.name, (regionsByName.get(g.name) ?? 0) + 1);
}

const rows = [...groups.values()].map((g) => {
  let campus = g.ownCampus ?? "";
  if (!g.ownCampus && regionsByName.get(g.name) > 1) {
    campus = CAMPUS[`${g.name}|${g.region}`] ?? `${g.region}캠퍼스`;
  }
  return { ...g, campus, domains: [...g.domains].sort() };
});
rows.sort((a, b) => a.name.localeCompare(b.name, "ko") || a.campus.localeCompare(b.campus, "ko"));

const q = (s) => `'${s.replace(/'/g, "''")}'`;
const values = rows.map(
  (r) =>
    `  (${q(r.name)}, ${q(r.campus)}, ${q(r.region)}, ${q(r.kind)}, ` +
    `${r.domains.length ? `array[${r.domains.map(q).join(", ")}]` : "'{}'"})`,
);

console.log(`-- 커리어넷(career.go.kr) 학교 목록 기준 ${rows.length}개 학교
-- scripts/build-universities.mjs 로 생성함. 직접 수정하지 말 것.
insert into public.universities (name, campus, region, kind, domains) values
${values.join(",\n")}
on conflict (name, campus) do update
  set region = excluded.region, kind = excluded.kind, domains = excluded.domains;`);
