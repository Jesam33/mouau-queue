-- MOUAU Smart Queue Management System - Database Schema

-- 1. Offices table
CREATE TABLE offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Building',
  color TEXT DEFAULT '#6b7280',
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  operating_hours_start TIME DEFAULT '08:00',
  operating_hours_end TIME DEFAULT '16:00',
  qr_code_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  matric_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT,
  level TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  office_id UUID REFERENCES offices,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Queue entries (tickets)
CREATE TABLE queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  ticket_number TEXT UNIQUE NOT NULL,
  position INTEGER NOT NULL,
  join_method TEXT DEFAULT 'remote' CHECK (join_method IN ('remote', 'walkin')),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'checked_in', 'being_served', 'served', 'skipped', 'cancelled')),
  checked_in_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Queue snapshots (for AI prediction)
CREATE TABLE queue_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices ON DELETE CASCADE,
  count INTEGER NOT NULL,
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES queue_entries ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_queue_entries_office_status ON queue_entries(office_id, status);
CREATE INDEX idx_queue_entries_student_active ON queue_entries(student_id, status) WHERE status NOT IN ('served', 'cancelled', 'skipped');
CREATE INDEX idx_queue_snapshots_office_hour ON queue_snapshots(office_id, hour, day_of_week);
CREATE INDEX idx_notifications_student ON notifications(student_id, read);
CREATE INDEX idx_profiles_matric ON profiles(matric_number);

-- Enable Row Level Security
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper functions to avoid infinite recursion in policies
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_admin_for_office(office_id_param UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin' AND office_id = office_id_param
  );
END;
$$ LANGUAGE plpgsql;

-- RLS Policies

-- Offices: public read, admin write
CREATE POLICY "Offices are publicly readable" ON offices FOR SELECT USING (true);
CREATE POLICY "Admins can insert/update offices" ON offices FOR ALL USING (is_admin());

-- Profiles: users can read/update own profile
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (id = auth.uid() OR auth.uid() IS NULL);
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (is_admin());

-- Queue entries: students see own, admins see own office
CREATE POLICY "Students see own tickets" ON queue_entries FOR SELECT USING (
  student_id = auth.uid() OR is_admin_for_office(office_id)
);
CREATE POLICY "Students can insert tickets" ON queue_entries FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can update own tickets" ON queue_entries FOR UPDATE USING (student_id = auth.uid());
CREATE POLICY "Admins manage tickets in their office" ON queue_entries FOR UPDATE USING (
  is_admin_for_office(office_id)
);

-- Queue snapshots: public read, service role write
CREATE POLICY "Snapshots publicly readable" ON queue_snapshots FOR SELECT USING (true);

-- Notifications: students see own
CREATE POLICY "Students see own notifications" ON notifications FOR SELECT USING (student_id = auth.uid());

-- Enable realtime for queue_entries
ALTER PUBLICATION supabase_realtime ADD TABLE queue_entries;

-- Seed offices
INSERT INTO offices (name, icon, color, capacity, operating_hours_start, operating_hours_end) VALUES
  ('Registry', 'Building2', '#374151', 30, '08:00', '16:00'),
  ('Bursary', 'Wallet', '#4b5563', 25, '08:00', '15:00'),
  ('Exams & Records', 'FileText', '#6b7280', 20, '08:00', '16:00'),
  ('Students Affairs', 'Users', '#9ca3af', 30, '08:00', '16:00'),
  ('COLPAS Computer Science Department', 'Monitor', '#374151', 20, '09:00', '16:00'),
  ('Bookshop', 'BookOpen', '#4b5563', 15, '08:00', '17:00'),
  ('Admin Block', 'Landmark', '#1f2937', 40, '08:00', '16:00'),
  ('MOUAU Portal', 'Globe', '#6b7280', 10, '06:00', '22:00');
