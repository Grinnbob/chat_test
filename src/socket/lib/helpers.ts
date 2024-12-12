import { Message } from 'src/chat/models/message.model';
import { Room } from 'src/chat/models/room.model';

export const isRoom = (obj: Room | Message): obj is Room => {
  return !('text' in obj);
};
