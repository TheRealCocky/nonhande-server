export interface IRoom {
  roomId: string;
  hostId: string;
  title: string;
  isActive: boolean;
  participants: string[];
}