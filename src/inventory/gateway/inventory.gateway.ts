import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
} from "@nestjs/websockets";
import { Logger, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import { ClusterId } from "../../auth/decorator/cluster-id.decorator";
import { AuthGuard } from "../../auth/gurad/auth.guard";
import { StorageDto } from "../dto/storage.dto";
import { InventoryService } from "../service/inventory.service";
import { WebSocket } from "ws";
import { OnEvent } from "@nestjs/event-emitter";

/**
 * The inventory gateway that handles inventory updates
 */
@WebSocketGateway({ path: "/inventory" })
@UsePipes(ValidationPipe)
@UseGuards(AuthGuard)
export class InventoryGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    /**
     * The logger instance used to log messages
     * @private
     */
    private readonly logger = new Logger(InventoryGateway.name);
    /**
     * The set of clients subscribed to each cluster
     * @private
     */
    private readonly clients = new Map<string, Set<WebSocket>>();
    /**
     * The mapping of clients to the cluster they are subscribed to
     * @private
     */
    private readonly clientClusters = new Map<WebSocket, string>();

    /**
     * Initializes the inventory gateway
     * @param inventoryService The inventory service
     */
    public constructor(private readonly inventoryService: InventoryService) {}

    /**
     * Handles a new client connection
     */
    public async handleConnection(): Promise<void> {
        this.logger.log("Client connected");
    }

    /**
     * Handles a client disconnect
     * Unsubscribes the client from the cluster it was subscribed to
     * @param client The client that disconnected
     */
    public async handleDisconnect(client: WebSocket): Promise<void> {
        this.logger.log("Client disconnected");

        // unsubscribe the client from the cluster it was subscribed to
        const clusterId = this.clientClusters.get(client);
        if (clusterId) {
            await this.unsubscribe(clusterId, client);
        }
    }

    /**
     * Subscribes the client to the specified cluster
     * @param clusterId The ID of the cluster to subscribe to
     * @param socket The client socket
     */
    @SubscribeMessage("subscribe")
    public async subscribe(
        @ClusterId() clusterId: string,
        @ConnectedSocket() socket: WebSocket,
    ): Promise<void> {
        this.logger.log(`Subscribing client to cluster ${clusterId}`);

        // add the socket to the set of clients
        const sockets = this.clients.get(clusterId) ?? new Set<WebSocket>();
        sockets.add(socket);
        this.clients.set(clusterId, sockets);
        this.clientClusters.set(socket, clusterId);

        // emit the current inventory
        const inventory = await this.inventoryService.getInventory(clusterId);
        for (const storage of inventory) {
            this.sendInventoryUpdate(socket, storage);
        }
    }

    /**
     * Unsubscribes the client from the specified cluster
     * @param clusterId The ID of the cluster to unsubscribe from
     * @param socket The client socket
     */
    @SubscribeMessage("unsubscribe")
    public async unsubscribe(
        @ClusterId() clusterId: string,
        @ConnectedSocket() socket: WebSocket,
    ): Promise<void> {
        this.logger.log(`Unsubscribing client from cluster ${clusterId}`);

        // remove the socket from the set of clients
        const sockets = this.clients.get(clusterId);
        sockets?.delete(socket);
        this.clientClusters.delete(socket);
    }

    /**
     * Updates the inventory for the specified cluster
     * @param clusterId The ID of the cluster
     * @param storage The storage to update
     */
    @SubscribeMessage("update")
    public async updateInventory(
        @ClusterId() clusterId: string,
        @MessageBody() storage: StorageDto,
    ): Promise<void> {
        // update the inventory
        await this.inventoryService.updateInventory(clusterId, storage);
    }

    /**
     * Handles an inventory update event
     * @param clusterId The ID of the cluster
     * @param storage The updated storage
     */
    @OnEvent("inventory.updated")
    public async handleInventoryUpdate(
        clusterId: string,
        storage: StorageDto,
    ): Promise<void> {
        // send the inventory update to all clients subscribed to the cluster
        const sockets = this.clients.get(clusterId);
        if (sockets) {
            this.logger.log(
                `Sending inventory update for cluster ${clusterId} to ${sockets.size} subscribed clients`,
            );
            for (const socket of sockets) {
                this.sendInventoryUpdate(socket, storage);
            }
        }
    }

    /**
     * Sends an inventory update to the client
     * @param socket The client socket
     * @param storage The updated storage
     * @private
     */
    private sendInventoryUpdate(socket: WebSocket, storage: StorageDto): void {
        socket.send(
            JSON.stringify({
                event: "update",
                data: storage,
            }),
        );
    }
}
