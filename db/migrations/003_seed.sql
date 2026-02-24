-- StatusGuard — Migration 003: Seed Data
-- Creates default roles and initial admin user placeholder.

BEGIN;

-- Insert RBAC roles
INSERT INTO roles (name) VALUES ('admin'), ('editor'), ('viewer')
ON CONFLICT (name) DO NOTHING;

-- Insert a sample status page for testing
INSERT INTO status_pages (id, name, slug, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Platform Status', 'platform', 'Main platform status page')
ON CONFLICT (id) DO NOTHING;

-- Note: The first admin user is auto-created on first OIDC login.
-- The backend should check if zero admin users exist and grant
-- the admin role to the first authenticated user.

COMMIT;
