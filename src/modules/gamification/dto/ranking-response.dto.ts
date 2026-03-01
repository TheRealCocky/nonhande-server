export class RankingUserDto {
  id: string;
  name: string;
  avatarUrl?: string;
  xp?: number;
  streak?: number;
}

export class UserPositionDto {
  position: number;
  currentXp: number;
  nextTarget: {
    name: string;
    xpDiff: number;
  } | null;
}