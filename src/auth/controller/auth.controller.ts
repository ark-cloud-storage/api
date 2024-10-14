import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "../service/auth.service";
import { ClusterDto } from "../dto/cluster.dto";
import { LoginRequestDto } from "../dto/login.request.dto";
import { RegisterRequestDto } from "../dto/register.request.dto";
import { AllowUnauthorized } from "../decorator/allow-unauthorized.decorator";

/**
 * The authentication controller that handles authentication requests
 */
@Controller("auth")
export class AuthController {
    /**
     * Initializes the authentication controller
     * @param authService The authentication service
     */
    public constructor(private readonly authService: AuthService) {}

    /**
     * @see AuthService.login
     */
    @Post("login")
    @AllowUnauthorized()
    public async login(@Body() body: LoginRequestDto): Promise<ClusterDto> {
        return this.authService.login(body.id, body.secret);
    }

    /**
     * @see AuthService.register
     */
    @Post("register")
    @AllowUnauthorized()
    public async register(
        @Body() body: RegisterRequestDto,
    ): Promise<ClusterDto> {
        return this.authService.register(body.id);
    }
}
