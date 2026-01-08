import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
export declare class AuthService {
    private readonly users;
    private readonly jwt;
    constructor(users: UsersService, jwt: JwtService);
    login(username: string, password: string): Promise<{
        accessToken: string;
        user: {
            id: string;
            username: string;
            role: import("../users/user.entity").UserRole;
        };
    }>;
}
