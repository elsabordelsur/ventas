const SUPABASE_URL = 'https://putmambqopgifxnhervv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1dG1hbWJxb3BnaWZ4bmhlcnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMTA0NDEsImV4cCI6MjEwMDg4NjQ0MX0.SsdwPlwc4vKx0HzlpOo8UGt7j7l8ZO9RER0BMVQIxX4'

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
})
