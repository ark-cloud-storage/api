import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    OnModuleInit,
    UnauthorizedException,
} from "@nestjs/common";
import { DatabaseService } from "../../database/service/database.service";
import { createHmac, randomBytes } from "crypto";
import { ClusterDto } from "../dto/cluster.dto";
import { ConfigService } from "@nestjs/config";
import { ALLOW_REGISTRATION, REGISTER_CLUSTERS } from "../constants";
import { boolean } from "boolean";
import { hashSecret, verifySecret, verifySecretAsync } from "../password.util";
import { AuthCacheService } from "./auth-cache.service";

/**
 * The authentication service that handles cluster registration and login
 */
@Injectable()
export class AuthService implements OnModuleInit {
    /**
     * The logger instance used to log messages
     * @private
     */
    private readonly logger = new Logger(AuthService.name);

    /**
     * Per-process random key for deriving auth-cache keys. Regenerated every
     * boot (the cache is in-memory and does not survive a restart), so a heap
     * dump exposes only HMACs under an ephemeral key, not crackable secret
     * digests.
     * @private
     */
    private readonly cacheKeyHmacKey = randomBytes(32);

    /**
     * Initializes the authentication service
     * @param databaseService The database service
     * @param configService The configuration service
     * @param authCache The auth verification cache
     */
    public constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService,
        private readonly authCache: AuthCacheService,
    ) {}

    public async onModuleInit(): Promise<void> {
        const registerClusters =
            this.configService.get<string>(REGISTER_CLUSTERS);
        if (registerClusters) {
            await this.registerClusters(registerClusters);
        }
    }

    private async registerClusters(clustersString: string): Promise<void> {
        const clusters = clustersString.split(",");
        for (const cluster of clusters) {
            const [id, secret] = cluster.split(":");
            const existing = await this.databaseService.cluster.findUnique({
                where: { id },
            });
            if (existing && verifySecret(secret, existing.secret)) {
                continue;
            }
            this.logger.log(`Registering cluster ${id} from configuration`);
            const hashed = hashSecret(secret);
            await this.databaseService.cluster.upsert({
                where: { id },
                update: { secret: hashed },
                create: { id, secret: hashed },
            });
        }
    }

    /**
     * Registers a new cluster with the given ID
     * @param id The ID of the cluster
     * @returns The cluster DTO
     * @throws ConflictException If the cluster already exists
     * @throws BadRequestException If registration is disabled
     * @throws Error If the database operation fails
     */
    public async register(id: string): Promise<ClusterDto> {
        const registrationEnabled = boolean(
            this.configService.get(ALLOW_REGISTRATION),
        );
        if (!registrationEnabled) {
            throw new BadRequestException("Registration is disabled");
        }

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
        await this.databaseService.cluster.create({
            data: { id, secret: hashSecret(secret) },
        });

        // Return the plaintext secret once so the operator can configure the mod
        return new ClusterDto(id, secret);
    }

    /**
     * Logs in a cluster with the given ID and secret.
     * Returns immediately on a cached successful verification; otherwise
     * verifies against the stored scrypt hash and caches the success.
     * @param id The ID of the cluster
     * @param secret The secret of the cluster
     * @returns The authenticated cluster id
     * @throws UnauthorizedException If the cluster is unknown or the secret is invalid
     */
    public async login(id: string, secret: string): Promise<string> {
        const cacheKey = `${id}:${createHmac("sha256", this.cacheKeyHmacKey)
            .update(secret)
            .digest("hex")}`;
        if (this.authCache.isValid(cacheKey)) {
            return id;
        }

        const cluster = await this.databaseService.cluster.findUnique({
            where: { id },
        });
        if (!cluster) {
            throw new UnauthorizedException("Cluster not found");
        }
        if (!(await verifySecretAsync(secret, cluster.secret))) {
            throw new UnauthorizedException("Invalid credentials");
        }

        this.authCache.set(cacheKey);
        return cluster.id;
    }
}
