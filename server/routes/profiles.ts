import { Router, Request, Response } from 'express';

export const profilesRouter = Router();

// Store user profiles - in a real app this would be in the database
// but for now we use auth data
const authUsersReference = new Map<string, any>();

export function registerAuthUser(userId: string, userData: any) {
  authUsersReference.set(userId, userData);
}

// Get user profile by ID
profilesRouter.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Get from auth users reference
    const user = authUsersReference.get(userId);
    if (user) {
      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    }

    // Fallback if not found
    res.json({
      id: userId,
      name: 'User',
      role: 'viewer',
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});
