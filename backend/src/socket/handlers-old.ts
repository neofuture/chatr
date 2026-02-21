import { Server, Socket } from 'socket.io';

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    // User authentication via socket
    socket.on('authenticate', (token: string) => {
      // TODO: Verify JWT token
      // TODO: Associate socket with user ID
      // TODO: Join user to their personal room
      console.log('User authentication requested');
    });

    // User comes online
    socket.on('user:online', (userId: string) => {
      // TODO: Update user status in Redis
      // TODO: Notify friends/contacts
      console.log(`User ${userId} is online`);
    });

    // User goes offline
    socket.on('user:offline', (userId: string) => {
      // TODO: Update user status in Redis
      // TODO: Store last seen timestamp
      console.log(`User ${userId} is offline`);
    });

    // Send private message (real-time)
    socket.on('message:send', (data: { recipientId: string; content: string }) => {
      // TODO: Validate message
      // TODO: Save to database
      // TODO: Add to Bull queue for reliability
      // TODO: Emit to recipient if online
      console.log('Private message sent', data);
    });

    // Send group message (real-time)
    socket.on('group:message:send', (data: { groupId: string; content: string }) => {
      // TODO: Validate message
      // TODO: Save to database
      // TODO: Broadcast to all group members
      console.log('Group message sent', data);
    });

    // Message received acknowledgment
    socket.on('message:received', (messageId: string) => {
      // TODO: Update message delivery status
      // TODO: Notify sender
      console.log(`Message ${messageId} received`);
    });

    // Message read acknowledgment
    socket.on('message:read', (messageId: string) => {
      // TODO: Update message read status
      // TODO: Notify sender
      console.log(`Message ${messageId} read`);
    });

    // Typing indicator (start)
    socket.on('typing:start', (data: { recipientId?: string; groupId?: string }) => {
      // TODO: Notify recipient or group members
      console.log('User is typing', data);
    });

    // Typing indicator (stop)
    socket.on('typing:stop', (data: { recipientId?: string; groupId?: string }) => {
      // TODO: Notify recipient or group members to stop showing indicator
      console.log('User stopped typing', data);
    });

    // User disconnect
    socket.on('disconnect', () => {
      // TODO: Update user status to offline
      // TODO: Store last seen timestamp
      console.log(`User disconnected: ${socket.id}`);
    });
  });
}

