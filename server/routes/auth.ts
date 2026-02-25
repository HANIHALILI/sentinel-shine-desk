import { Router, Request, Response } from 'express';
import { getPool } from '../db/pool.js';
import { registerAuthUser } from './profiles.js';

export const authRouter = Router();

interface User {
  id: string;
  email: string;
  name?: string;
  created_at?: string;
}

// Simple in-memory user store for demo (replace with database in production)
const users = new Map<string, { email: string; password: string; name: string; id: string; role: string }>();

function generateUserId() {
  return 'user_' + Math.random().toString(36).substring(7);
}

// Signup
authRouter.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    for (const user of users.values()) {
      if (user.email === email) {
        return res.status(400).json({ error: 'User already exists' });
      }
    }

    const userId = generateUserId();
    const newUser = {
      id: userId,
      email,
      password,
      name: name || email.split('@')[0],
      role: 'admin', // First user is admin
    };
    users.set(userId, newUser);
    registerAuthUser(userId, newUser);

    res.json({
      id: userId,
      email,
      name: name || email.split('@')[0],
      role: 'admin',
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    let user = null;
    for (const u of users.values()) {
      if (u.email === email && u.password === password) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    registerAuthUser(user.id, user);

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
authRouter.get('/user', async (req: Request, res: Response) => {
  try {
    // In a real app, extract user ID from JWT or session
    // For now, return a default user if no proper auth is available
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Logout
authRouter.post('/logout', async (req: Request, res: Response) => {
  try {
    // In a real app, invalidate the session/token
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});
