export type Gender = "male" | "female";
export type RideStatus = "open" | "closed" | "cancelled";

export type University = {
  id: number;
  name: string;
  campus: string;
  region: string;
  kind?: "4년제" | "전문대" | "대학원" | null;
  domains?: string[];
};

export type Profile = {
  id: string;
  nickname: string;
  gender: Gender;
  university_id: number;
  pay_link: string | null;
  agreed_at: string;
};

export type Ride = {
  id: string;
  host_id: string | null; // 방장이 탈퇴하면 null
  university_id: number;
  origin: string;
  destination: string;
  depart_at: string;
  capacity: number;
  member_count: number;
  /** 한 번이라도 모였던 최대 인원. 누가 나가도 줄지 않아 매칭 성공 여부를 남긴다. */
  peak_members: number;
  same_gender_only: boolean;
  host_gender: Gender;
  estimated_fare: number | null;
  final_fare: number | null;
  note: string | null;
  status: RideStatus;
  created_at: string;
};

export type RideWithUniversity = Ride & { university: University | null };

export type Member = {
  user_id: string;
  joined_at: string;
  profile: Pick<Profile, "id" | "nickname" | "gender" | "university_id"> | null;
};

export type Message = {
  id: number;
  ride_id: string;
  /** null이면 시스템 메시지 */
  user_id: string | null;
  content: string;
  created_at: string;
};
