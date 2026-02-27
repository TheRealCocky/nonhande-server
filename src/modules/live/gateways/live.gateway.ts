import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: 'live',
  cors: { origin: '*' },
  transports: ['websocket'], // Essencial para performance no Render
})
export class LiveGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.roomId);
    // Notifica outros na sala que alguém entrou
    client.to(data.roomId).emit('user-joined', { userId: client.id });
  }

  // 1. Encaminha a Oferta WebRTC (SDP)
  @SubscribeMessage('offer')
  handleOffer(
    @MessageBody() data: { toRoom: string; offer: any },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.toRoom).emit('offer', {
      from: client.id,
      offer: data.offer,
    });
  }

  // 2. Encaminha a Resposta WebRTC (SDP)
  @SubscribeMessage('answer')
  handleAnswer(
    @MessageBody() data: { toRoom: string; answer: any },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.toRoom).emit('answer', {
      from: client.id,
      answer: data.answer,
    });
  }

  // 3. Troca de ICE Candidates (Caminhos de Rede)
  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @MessageBody() data: { toRoom: string; candidate: any },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.toRoom).emit('ice-candidate', data.candidate);
  }
}