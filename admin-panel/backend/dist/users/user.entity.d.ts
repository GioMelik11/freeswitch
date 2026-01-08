export type UserRole = 'admin' | 'operator';
export declare class User {
    id: string;
    username: string;
    passwordHash: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}
