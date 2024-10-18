import { Injectable } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";

/**
 * The custom WebSocket adapter that extends the default WebSocket adapter
 * and adds the upgrade headers to the WebSocket connection (`ws.upgradeHeaders`)
 */
@Injectable()
export class CustomWsAdapter extends WsAdapter {
    /**
     * Create a new WebSocket server
     * @param port The port to listen on
     * @param options The options for the WebSocket server
     */
    public create(port: number, options: unknown = {}): unknown {
        const server = super.create(port, options);
        server.on("connection", (ws, request) => {
            ws.upgradeHeaders = request.headers;
        });
        return server;
    }
}
