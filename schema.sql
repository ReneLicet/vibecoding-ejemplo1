-- ==========================================================================
-- CYBER TAC TOE - ESQUEMA DE BASE DE DATOS PARA SUPABASE (PostgreSQL)
-- Estructura para registrar partidas, jugadores y tabla de clasificación
-- ==========================================================================

-- 1. TABLA DE PARTIDAS (game_matches)
CREATE TABLE IF NOT EXISTS public.game_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mode VARCHAR(20) NOT NULL, -- 'pvp', 'ai-easy', 'ai-hard'
    player_x VARCHAR(50) DEFAULT 'Jugador X',
    player_o VARCHAR(50) DEFAULT 'IA Neural / Jugador O',
    winner VARCHAR(10) NOT NULL, -- 'X', 'O', 'DRAW'
    moves_count INT DEFAULT 0,
    played_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE ESTADÍSTICAS / LEADERBOARD (player_stats)
CREATE TABLE IF NOT EXISTS public.player_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_name VARCHAR(50) UNIQUE NOT NULL,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    draws INT DEFAULT 0,
    current_streak INT DEFAULT 0,
    best_streak INT DEFAULT 0,
    last_played_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HABILITAR SEGURIDAD (RLS - Row Level Security) Y POLÍTICAS PÚBLICAS
ALTER TABLE public.game_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

-- Permitir lectura y escritura pública para demo / cliente sin autenticación
CREATE POLICY "Permitir lectura publica de partidas" 
    ON public.game_matches FOR SELECT USING (true);

CREATE POLICY "Permitir insercion publica de partidas" 
    ON public.game_matches FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir lectura publica de estadísticas" 
    ON public.player_stats FOR SELECT USING (true);

CREATE POLICY "Permitir insercion y actualización publica de estadísticas" 
    ON public.player_stats FOR ALL USING (true);

-- 4. VISTA DE CLASIFICACIÓN (leaderboard_view)
CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT 
    player_name,
    wins,
    losses,
    draws,
    best_streak,
    (wins * 3 + draws * 1) AS total_points,
    last_played_at
FROM public.player_stats
ORDER BY total_points DESC, wins DESC;
