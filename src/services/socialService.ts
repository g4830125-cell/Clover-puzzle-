import { io, Socket } from 'socket.io-client';
import { Friend, FriendRequest, SocialState, GameInvite } from '../types';

class SocialService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private onSocialUpdate: ((state: SocialState) => void) | null = null;
  private onInviteReceived: ((invite: GameInvite) => void) | null = null;
  private onMatchFound: ((data: any) => void) | null = null;

  private state: SocialState = {
    friends: [],
    requests: [],
    invites: []
  };

  init(socket: Socket, userId: string, name: string, email?: string) {
    this.socket = socket;
    this.userId = userId;

    socket.emit('register_user', { userId, name, email });

    socket.on('friend_request_received', (request: FriendRequest) => {
      this.state.requests = [request, ...this.state.requests];
      this.update();
    });

    socket.on('friend_added', ({ userId }: { userId: string }) => {
      // Re-fetch social data to get latest friend list
      this.refreshSocialData();
    });

    socket.on('friend_presence', ({ userId, status }: { userId: string, status: string }) => {
      this.state.friends = this.state.friends.map(f => 
        f.userId === userId ? { ...f, status: status as any } : f
      );
      this.update();
    });

    socket.on('game_invite_received', (invite: GameInvite) => {
      this.state.invites = [invite, ...this.state.invites];
      this.update();
      if (this.onInviteReceived) this.onInviteReceived(invite);
    });

    socket.on('invite_accepted', ({ roomId, invite }: { roomId: string, invite: GameInvite }) => {
       console.log('Invite accepted, moving to room:', roomId);
       // The match_found logic will handle the UI transition
    });

    this.refreshSocialData();
  }

  private update() {
    if (this.onSocialUpdate) this.onSocialUpdate({ ...this.state });
  }

  refreshSocialData() {
    if (!this.socket) return;
    this.socket.emit('get_social_data', (data: SocialState) => {
      this.state.friends = data.friends;
      this.state.requests = data.requests;
      this.update();
    });
  }

  searchUsers(query: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return resolve([]);
      
      const timeout = setTimeout(() => {
        reject(new Error('Search timed out. Please check your connection.'));
      }, 8000); // 8 second timeout

      this.socket.emit('search_users', { query }, (results: any[]) => {
        clearTimeout(timeout);
        resolve(results);
      });
    });
  }

  sendFriendRequest(toId: string) {
    this.socket?.emit('send_friend_request', { toId });
  }

  acceptFriendRequest(fromId: string) {
    this.socket?.emit('accept_friend_request', { fromId });
    this.state.requests = this.state.requests.filter(r => r.fromId !== fromId);
    this.update();
  }

  sendGameInvite(toId: string, mode: '1v1' | '2v2') {
    this.socket?.emit('send_game_invite', { toId, mode });
  }

  acceptGameInvite(invite: GameInvite) {
    this.socket?.emit('accept_game_invite', { invite });
    this.state.invites = this.state.invites.filter(i => i.id !== invite.id);
    this.update();
  }

  setListeners(
    onSocialUpdate: (state: SocialState) => void,
    onInviteReceived: (invite: GameInvite) => void
  ) {
    this.onSocialUpdate = onSocialUpdate;
    this.onInviteReceived = onInviteReceived;
  }
}

export const socialService = new SocialService();
