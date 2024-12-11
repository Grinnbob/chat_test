import { Message } from 'src/messages/message.model';
import { Room } from 'src/messages/room.model';

export const isRoom = (obj: Room | Message): obj is Room => {
  return !('text' in obj);
};
