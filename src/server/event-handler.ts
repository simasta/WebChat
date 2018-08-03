import { RedisClient } from "redis";
import { Event, Handler } from "../common/events";
import { Token } from "../common/token";

export default class EventHandler {
  eventMap: Map<Event, Handler> = new Map([
    [Event.TOKEN_REQUEST, this.onTokenRequest]
  ]);
  authTokens: Map<string, Token> = new Map();

  constructor(db: RedisClient) {}

  registerEvents(server: SocketIO.Server) {
    server.on(Event.Connection, (socket: SocketIO.Socket) => {
      this.eventMap.forEach((handler: Handler, event: Event) => {
        socket.on(event, (...args: any[]) => {
          handler(socket, args);
        });
      });
    });
  }

  isValidAuthToken(socket: SocketIO.Socket, token: Token): boolean {
    const t = this.authTokens.get(socket.id);
    return (
      t != null &&
      // TODO(justiceo): Update this to single comparison when js or typescript adds something like Object.equals
      t.clientID === token.clientID &&
      t.token === token.token &&
      t.expires === token.expires &&
      t.expires > Date.now() - 60 * 1000 // 1 minute
    );
  }

  makeAuthToken(socket: SocketIO.Socket): Token {
    let tokenStr = "";
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 100; i++) {
      tokenStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const t = {
      token: tokenStr,
      expires: Date.now(),
      clientID: socket.client.id
    };
    this.authTokens.set(socket.id, t);
    return t;
  }

  onTokenRequest(socket: SocketIO.Socket): boolean {
    // TODO(justiceo): Remove this client from all other rooms they may be in.
    socket.emit(Event.TOKEN, this.makeAuthToken(socket));
    return true;
  }
}
