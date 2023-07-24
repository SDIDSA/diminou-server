

CREATE SEQUENCE public.friend_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

CREATE SEQUENCE public.user_uid_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

CREATE TABLE public."user" (
	id int4 NOT NULL DEFAULT nextval('user_uid_seq'::regclass),
	username text NOT NULL,
	email text NOT NULL,
	points int4 NULL DEFAULT 0,
	coins int4 NULL DEFAULT 0,
	"password" text NULL,
	avatar text NOT NULL,
	CONSTRAINT user_pkey PRIMARY KEY (id),
	CONSTRAINT user_un_em UNIQUE (email),
	CONSTRAINT user_un_id UNIQUE (id),
	CONSTRAINT user_un_un UNIQUE (username)
);

CREATE TABLE public.friend (
	id serial4 NOT NULL,
	sender int4 NOT NULL,
	receiver int4 NOT NULL,
	accepted bool NOT NULL DEFAULT false,
	CONSTRAINT friend_pk PRIMARY KEY (id),
	CONSTRAINT friend_fk FOREIGN KEY (sender) REFERENCES public."user"(id),
	CONSTRAINT friend_fk_1 FOREIGN KEY (receiver) REFERENCES public."user"(id)
);

CREATE TABLE public."session" (
	user_id int4 NOT NULL,
	"token" text NOT NULL,
	client text NULL,
	"location" text NULL,
	CONSTRAINT session_pkey PRIMARY KEY (user_id, token),
	CONSTRAINT user_session_id FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE ON UPDATE CASCADE
);
