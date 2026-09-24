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
};

export type Ride = {
  id: string;
  host_id: string;
  university_id: number;
  origin: string;
  destination: string;
  depart_at: string;
  capacity: number;
  member_count: number;
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
  user_id: string | null;
  content: string;
  created_at: string;
};
