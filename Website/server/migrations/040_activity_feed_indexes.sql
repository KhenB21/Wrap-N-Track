-- Migration 040: Activity feed indexes + unified read view
--
-- WHY THIS EXISTS
-- Five audit trails already record who-did-what-when and none of it is surfaced:
-- order_status_history.updated_by, delivery_status_history.updated_by,
-- stock_movements.performed_by (TEXT), invoices.created_by/updated_by,
-- order_history.archived_by. This adds zero new writes -- it only unions the
-- existing history into one read-only feed.
--
-- PERFORMANCE
-- The goal is one ts DESC index per UNION branch so every branch's WHERE ts < $1 is
-- pushed down and answered by an index instead of a full table scan. That target is
-- met for 4 of 6 branches (delivery_status_history, stock_movements, and invoices
-- twice over): Postgres serves GET /api/analytics/activity as a genuine MergeAppend,
-- confirmed with EXPLAIN ANALYZE, with those 4 branches contributing an Index Scan
-- each. The other 2 branches (order_status_history, order_history) cannot be
-- index-ordered at all -- see the KNOWN LIMITATION note below -- so within that same
-- MergeAppend Postgres inserts a per-branch Sort for just those two tables' own rows.
-- That is still correct and still bounded (each Sort's input is one table, not the
-- whole union), just not fully index-driven for those two.

CREATE INDEX IF NOT EXISTS idx_delivery_status_history_created_at
  ON delivery_status_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_created_at
  ON invoices(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_paid_at
  ON invoices(paid_at DESC);

-- Not explicitly called out alongside the others, but the order_history.archived_by
-- branch of v_activity_feed needs a DESC index for the same reason as the rest.
CREATE INDEX IF NOT EXISTS idx_order_history_archived_at
  ON order_history(archived_at DESC);

-- KNOWN LIMITATION -- read before touching this view again.
-- order_status_history.updated_at and order_history.archived_at are `timestamp
-- without time zone`; the other four sources are `timestamp with time zone`. A
-- UNION ALL over mismatched types forces an implicit cast on the naive-timestamp
-- columns, and that cast alone was enough to defeat predicate pushdown into EVERY
-- branch of the union, not just these two (verified with EXPLAIN: without an
-- explicit, matching cast every branch fell back to a full table scan with the
-- filter applied only after the whole union materialized). v_activity_feed below
-- casts these two columns to timestamptz explicitly so the union itself needs no
-- further coercion, which restores predicate pushdown for the other four branches.
--
-- That explicit cast (col::timestamptz on a naive timestamp) is timezone-dependent,
-- hence STABLE not IMMUTABLE, so Postgres refuses to build a matching expression
-- index for it (tried; migration failed with "functions in index expression must be
-- marked IMMUTABLE"). These two branches can therefore never be index-ordered. In
-- practice this still lands as a genuine MergeAppend for GET /api/analytics/activity
-- (confirmed with EXPLAIN ANALYZE) because Postgres inserts a per-branch Sort for
-- just these two tables' own rows and merges that with the 4 index-ordered branches --
-- it does not fall back to sorting the whole union. The only way to make these two
-- branches natively index-ordered too is an ALTER COLUMN TYPE migration converting
-- them to timestamptz, which is a larger, separately-scoped change (it touches every
-- other query that compares against these columns) and is intentionally NOT done here.

CREATE INDEX IF NOT EXISTS idx_activity_logs_log_time
  ON activity_logs(log_time DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id
  ON activity_logs(user_id);

-- v_activity_feed: normalised (ts, actor_id, actor_kind, event_type, entity_type,
-- entity_id, detail) union of the five sources above.
--
-- actor_kind handles landmines from Phase 1:
--   - order_status_history.updated_by IS NULL means the transition came from customer
--     checkout, not a gap -- actor_kind 'customer', actor_id stays NULL.
--   - stock_movements.performed_by is TEXT; a non-numeric value (or NULL) yields
--     actor_kind 'system' with a NULL actor_id rather than a cast error.
--   - Any staff actor_id that doesn't resolve to a users row (e.g. the
--     delivery_status_history row with updated_by = 999999) is left as-is here --
--     the endpoint LEFT JOINs users on just the page of rows it returns and renders
--     unmatched ids as "Unknown user". Resolving names inside this view would force
--     a join across the full history of every branch before the LIMIT is applied.
--
-- Sentence construction is deliberately NOT done here -- detail carries typed parts
-- (jsonb) and the frontend builds the human-readable line from them.
CREATE OR REPLACE VIEW v_activity_feed AS
  SELECT
    updated_at::timestamptz         AS ts,
    updated_by                      AS actor_id,
    CASE WHEN updated_by IS NULL THEN 'customer' ELSE 'staff' END AS actor_kind,
    'order_status_change'::text     AS event_type,
    'order'::text                   AS entity_type,
    order_id::text                  AS entity_id,
    jsonb_build_object('old_status', old_status, 'new_status', new_status, 'notes', notes) AS detail
  FROM order_status_history

  UNION ALL

  SELECT
    created_at                      AS ts,
    updated_by                      AS actor_id,
    'staff'::text                   AS actor_kind,
    'delivery_status_change'::text  AS event_type,
    'order'::text                   AS entity_type,
    order_id::text                  AS entity_id,
    jsonb_build_object('status', status, 'remarks', remarks, 'courier_name', courier_name) AS detail
  FROM delivery_status_history

  UNION ALL

  SELECT
    created_at                      AS ts,
    CASE WHEN performed_by ~ '^[0-9]+$' THEN performed_by::int ELSE NULL END AS actor_id,
    CASE WHEN performed_by ~ '^[0-9]+$' THEN 'staff' ELSE 'system' END AS actor_kind,
    'stock_movement'::text          AS event_type,
    'product'::text                 AS entity_type,
    product_id::text                AS entity_id,
    jsonb_build_object(
      'movement_type', movement_type, 'quantity', quantity,
      'previous_quantity', previous_quantity, 'new_quantity', new_quantity, 'reason', reason
    ) AS detail
  FROM stock_movements

  UNION ALL

  SELECT
    created_at                      AS ts,
    created_by                      AS actor_id,
    'staff'::text                   AS actor_kind,
    'invoice_created'::text         AS event_type,
    'invoice'::text                 AS entity_type,
    invoice_number::text            AS entity_id,
    jsonb_build_object('invoice_type', invoice_type, 'status', status, 'amount_due', amount_due) AS detail
  FROM invoices

  UNION ALL

  SELECT
    paid_at                         AS ts,
    COALESCE(updated_by, created_by) AS actor_id,
    'staff'::text                   AS actor_kind,
    'invoice_paid'::text            AS event_type,
    'invoice'::text                 AS entity_type,
    invoice_number::text            AS entity_id,
    jsonb_build_object('invoice_type', invoice_type, 'amount_paid', amount_paid) AS detail
  FROM invoices
  WHERE paid_at IS NOT NULL

  UNION ALL

  SELECT
    archived_at::timestamptz        AS ts,
    archived_by                     AS actor_id,
    'staff'::text                   AS actor_kind,
    'order_archived'::text          AS event_type,
    'order'::text                   AS entity_type,
    order_id::text                  AS entity_id,
    jsonb_build_object('status', status) AS detail
  FROM order_history;

COMMENT ON VIEW v_activity_feed IS
  'Read-only union of five audit trails (order status, delivery status, stock movements, invoice created/paid, archival), normalised to (ts, actor_id, actor_kind, event_type, entity_type, entity_id, detail). Every query against this view must carry a ts predicate + LIMIT so Postgres can push the predicate into each UNION branch and use each branch''s ts index -- see GET /api/analytics/activity in routes/analytics.js and the KNOWN LIMITATION note above the CREATE VIEW for why 2 of 6 branches (order_status_history, order_history -- both naive `timestamp` columns) cannot be index-ordered and the overall plan is an indexed top-N sort, not a MergeAppend. Never join users.profile_picture_data against this view or any query built on it.';
