import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hufsuuhphgsiyorhtrow.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1ZnN1dWhwaGdzaXlvcmh0cm93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MDE2OTQsImV4cCI6MjA5MzM3NzY5NH0.ARAa9fj1VMkfecqOFTex4MDput1k7RUrZMbM9Fjt6MQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
