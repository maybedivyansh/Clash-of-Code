-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.matches (
  id text NOT NULL,
  player1_id text,
  player2_id text,
  winner_id text,
  duration integer NOT NULL,
  status text DEFAULT 'finished'::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  p1_health integer DEFAULT 100,
  p2_health integer DEFAULT 100,
  question_id uuid,
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.users(id),
  CONSTRAINT fk_question FOREIGN KEY (question_id) REFERENCES public.questions(id)
);
CREATE TABLE public.matchmaking_queue (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id text NOT NULL UNIQUE,
  duration integer NOT NULL,
  socket_id text NOT NULL,
  rating integer DEFAULT 1000,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  room_id text,
  CONSTRAINT matchmaking_queue_pkey PRIMARY KEY (id)
);
CREATE TABLE public.questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text NOT NULL,
  starter_code text NOT NULL,
  test_cases jsonb NOT NULL,
  difficulty text DEFAULT 'Medium'::text CHECK (difficulty = ANY (ARRAY['Easy'::text, 'Medium'::text, 'Hard'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT questions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id text NOT NULL,
  username text,
  rating integer DEFAULT 1000,
  wins integer DEFAULT 0,
  losses integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);