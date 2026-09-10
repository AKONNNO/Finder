// js/supabase.js
const SUPABASE_URL = 'https://vxmmfuobstqlfltcasmp.supabase.co/rest/v1/T_URL';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4bW1mdW9ic3RxbGZsdGNhc21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5OTAxNzYsImV4cCI6MjEwNDU2NjE3Nn0.sIN37X3fs6GS-mYw6ODwUu7SWmHxOKR4uNaHzf1K60g';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);