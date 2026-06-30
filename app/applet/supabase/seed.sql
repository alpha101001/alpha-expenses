-- Seed test data
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'alpha1@example.com'),
  ('00000000-0000-0000-0000-000000000002', 'alpha2@example.com');

INSERT INTO profiles (id, email, full_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'alpha1@example.com', 'Test User 1'),
  ('00000000-0000-0000-0000-000000000002', 'alpha2@example.com', 'Test User 2');
