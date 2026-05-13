/**
 * Data Transfer Objects for User operations
 */

export interface CreateUserDTO {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: 'worker' | 'client';
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface UpdateUserDTO {
  firstName?: string;
  lastName?: string;
  bio?: string;
  profileImage?: string;
  skills?: string[];
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface UserResponseDTO {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  profileImage?: string;
  bio?: string;
  rating: number;
  reviewCount: number;
  createdAt: Date;
}
