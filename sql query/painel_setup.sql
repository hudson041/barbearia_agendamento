-- =====================================================================
-- PREPARAÇÃO DO PAINEL — rode no SQL Editor do Supabase
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Atualização em tempo real da agenda
--    Faz o painel receber agendamentos novos sem precisar recarregar.
--    (Se a tabela já estiver na publicação, o bloco ignora o erro.)
-- ---------------------------------------------------------------------
do $$
begin
    alter publication supabase_realtime add table agendamentos;
exception
    when duplicate_object then null;
end $$;


-- ---------------------------------------------------------------------
-- 2. Vincular o usuário do dono à barbearia
--
--    Antes, crie o usuário em: Authentication > Users > Add user
--    (informe e-mail e senha e MARQUE "Auto Confirm User").
--
--    Depois descubra o id dele:
-- ---------------------------------------------------------------------
select id, email from auth.users;

-- ---------------------------------------------------------------------
--    Copie o id da consulta acima, troque abaixo e rode.
--    Se o perfil já existir, o "on conflict" apenas o atualiza.
-- ---------------------------------------------------------------------
insert into profiles (id, barbearia_id, role, nome)
values (
    '9959f2a1-1129-45fd-9524-ee864bbf22c7',
    (select id from barbearias where slug = 'barbearia-do-lenon'),
    'admin',
    'Administrador'
)
on conflict (id) do update
    set barbearia_id = excluded.barbearia_id,
        role         = excluded.role,
        nome         = excluded.nome;


-- ---------------------------------------------------------------------
-- 3. Conferência: deve listar o usuário com role 'admin' e a barbearia
-- ---------------------------------------------------------------------
select p.id, p.nome, p.role, b.nome as barbearia
from profiles p
left join barbearias b on b.id = p.barbearia_id;
