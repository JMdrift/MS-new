/* ==========================================================
   SUPABASE - KONFIGURACE (Krok 9)

   Dopln nize MS_SUPABASE_ANON_KEY svym "anon public" klicem.

   DULEZITE - jde o LEGACY format klice (dlouhy text zacinajici
   "eyJ..."), NE o novy kratsi "sb_publishable_..." klic, co
   Supabase nabizi jako vychozi zalozku. Zkousce s novym formatem
   appka dostavala od Supabase Auth chybu "Invalid API key" - tenhle
   projekt/verze knihovny s nim zatim spolehlive nefunguje.

   Najdes ho v Supabase dashboardu: Project Settings -> API Keys ->
   zalozka "Legacy anon, service_role API keys" -> radek "anon" /
   "public" (dlouhy JWT text).

   DULEZITE: tenhle klic NENI tajny. Klidne muze byt verejne
   v kodu appky (i na GitHubu) - je to jen "vstupenka", co appce
   dovoli se vubec zeptat databaze. Co presne smi kazdy clovek
   videt/upravit, hlida RLS na strane serveru (Kroky 3-6), ne
   tenhle klic. Nikdy sem ale nepatri "service_role" klic - ten
   je tajny a nesmi byt nikdy v appce/na GitHubu.
   ========================================================== */
const MS_SUPABASE_URL = 'https://nulbqlpucxkngglyeypl.supabase.co';
const MS_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51bGJxbHB1Y3hrbmdnbHlleXBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwODA1NzcsImV4cCI6MjEwMDY1NjU3N30.pVaa3qvQrFfNlAki5PQGY9JvlTU3Pci1UdBRDqGxO3I';
