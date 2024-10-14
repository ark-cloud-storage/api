import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import { DatabaseService } from "../../database/service/database.service";
import { randomBytes } from "crypto";
import { ClusterDto } from "../dto/cluster.dto";

/**
 * The authentication service that handles cluster registration and login
 */
@Injectable()
export class AuthService {
    public constructor(private readonly databaseService: DatabaseService) {}

    /**
     * Registers a new cluster with the given ID
     * @param id The ID of the cluster
     * @returns The cluster DTO
     * @throws ConflictException If the cluster already exists
     * @throws Error If the database operation fails
     */
    public async register(id: string): Promise<ClusterDto> {
        // Find the cluster by ID
        const existingCluster = await this.databaseService.cluster.findFirst({
            where: { id },
        });

        // If the cluster already exists, throw an error
        if (existingCluster) {
            throw new ConflictException("Cluster already exists");
        }

        // Create a new cluster with a random secret
        const secret = randomBytes(50).toString("hex");
        const cluster = await this.databaseService.cluster.create({
            data: { id, secret },
        });

        // Return the cluster DTO
        return ClusterDto.fromDatabase(cluster);
    }

    /**
     * Logs in a cluster with the given ID and secret
     * @param id The ID of the cluster
     * @param secret The secret of the cluster
     * @returns The cluster DTO
     * @throws UnauthorizedException If the cluster is not found or the secret is invalid
     * @throws Error If the database operation fails
     */
    public async login(id: string, secret: string): Promise<ClusterDto> {
        // Find the cluster by ID
        const cluster = await this.databaseService.cluster.findFirst({
            where: { id },
        });

        // Validate the cluster and secret
        if (!cluster) {
            throw new UnauthorizedException("Cluster not found");
        }
        if (cluster.secret !== secret) {
            throw new UnauthorizedException("Invalid credentials");
        }

        // Return the cluster DTO
        return ClusterDto.fromDatabase(cluster);
    }
}
