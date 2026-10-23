\set ON_ERROR_STOP on
\echo 'BELLMONT 05.W3B.6B.0 - ROLLBACK RESTRITO PARA DRAFT'
\echo 'NAO EXECUTAR SEM AUTORIZACAO EXPLICITA E DIAGNOSTICO DO INCIDENTE.'

begin;

do $rollback$
declare
  target_codes constant text[] := array[
    'ST-01','ST-02','ST-03','ST-04','ST-05','ST-06','ST-07','ST-08','ST-09','ST-10',
    'ST-11','ST-12','ST-13','ST-14','ST-15','ST-16','ST-17','ST-18','ST-19','ST-20',
    'PF-01','PF-02','PF-03','PF-04','PF-05','PF-06','PF-07','PF-08','PF-09','PF-10','PF-11',
    'PF-12','PF-13','PF-14','PF-15','PF-16','PF-17','PF-18','PF-19','PF-20','PF-21','PF-22',
    'IF-01','IF-02','IF-03','IF-04','IF-05'
  ];
  target_count bigint;
  draft_count bigint;
  active_count bigint;
  changed_count bigint;
begin
  perform 1 from public.products where code=any(target_codes) order by id for update;
  select count(*),count(*) filter(where status='draft'),count(*) filter(where status='active')
    into target_count,draft_count,active_count from public.products where code=any(target_codes);
  if target_count <> 47 then raise exception 'TARGET_PRODUCTS_MISMATCH: %', target_count; end if;

  if draft_count=47 and active_count=0 then
    raise notice 'ALREADY_DRAFT: nenhuma alteracao necessaria';
  elsif active_count=47 and draft_count=0 then
    update public.products set status='draft' where code=any(target_codes) and status='active';
    get diagnostics changed_count = row_count;
    if changed_count <> 47 then raise exception 'ROLLBACK_ROW_COUNT_MISMATCH: %', changed_count; end if;
  else
    raise exception 'UNSAFE_MIXED_STATUS: target=% draft=% active=%',target_count,draft_count,active_count;
  end if;

  select count(*) into changed_count from public.products where code='TEST-FIXTURE-01' and status='archived' and sales_mode='DISABLED';
  if changed_count <> 1 then raise exception 'FIXTURE_CHANGED'; end if;
end
$rollback$;

commit;
\echo 'ROLLBACK_CONCLUIDO - execute 01-preflight.sql para reconciliar o estado.'

