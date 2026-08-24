-- Migration 038: Unified analytics read layer over live + archived orders
--
-- WHY THIS EXISTS
-- Completed and Cancelled orders are copied into order_history and then DELETED
-- from `orders` (routes/orders.js, routes/order-management.js, routes/customer-orders.js).
-- Every analytics query in the system reads only `orders`, so completed orders --
-- exactly the ones that count as revenue -- disappear from every report the moment
-- they are archived. Measured before this migration: the Sales Report showed P350
-- for the current month against a true P1,549.97 including archived orders.
--
-- These views give the analytics layer one place to read from. They are READ-ONLY.
-- The archival flow is deliberately untouched: writers keep using the base tables.
--
-- NOTE ON TYPES: orders.status is a PostgreSQL enum (order_status_enum) while
-- order_history.status is varchar. The ::text cast on both branches is required or
-- the UNION fails to resolve a common type.
--
-- NOTE ON NULLS: order_history genuinely lacks total_profit_estimation, payment_status,
-- total_verified_payments, remaining_balance, the four order lifecycle timestamps and
-- status_updated_by/at. Those are projected as typed NULLs; callers must COALESCE.

CREATE OR REPLACE VIEW all_orders AS
  SELECT
    o.order_id,
    o.name                          AS customer_name,   -- archival writes orders.name into both columns
    o.name,
    o.shipped_to,
    o.order_date,
    o.expected_delivery,
    o.status::text                  AS status,
    o.shipping_address,
    o.total_cost,
    o.payment_type,
    o.payment_method,
    o.account_name,
    o.telephone,
    o.cellphone,
    o.email_address,
    o.customer_id,
    o.order_quantity,
    o.total_profit_estimation,
    o.payment_status,
    o.total_verified_payments,
    o.remaining_balance,
    o.order_placed_at,
    o.order_paid_at,
    o.order_shipped_at,
    o.order_received_at,
    o.status_updated_by,
    o.status_updated_at,
    o.delivery_status,
    o.delivery_method,
    o.delivery_mode_id,
    o.delivery_type,
    o.courier_name,
    o.tracking_number,
    o.sent_at,
    o.picked_up_at,
    o.delivered_at,
    o.delivery_updated_by,
    o.delivery_updated_at,
    o.proof_uploaded_by,
    o.proof_uploaded_at,
    false                           AS is_archived,
    NULL::timestamp                 AS archived_at,
    NULL::integer                   AS archived_by
  FROM orders o

  UNION ALL

  SELECT
    h.order_id,
    h.customer_name,
    h.name,
    h.shipped_to,
    h.order_date,
    h.expected_delivery,
    h.status::text                  AS status,
    h.shipping_address,
    h.total_cost,
    h.payment_type,
    h.payment_method,
    h.account_name,
    h.telephone,
    h.cellphone,
    h.email_address,
    h.customer_id,
    h.order_quantity,
    NULL::numeric                   AS total_profit_estimation,
    NULL::varchar(30)               AS payment_status,
    NULL::numeric                   AS total_verified_payments,
    NULL::numeric                   AS remaining_balance,
    NULL::timestamp                 AS order_placed_at,
    NULL::timestamp                 AS order_paid_at,
    NULL::timestamp                 AS order_shipped_at,
    NULL::timestamp                 AS order_received_at,
    NULL::integer                   AS status_updated_by,
    NULL::timestamp                 AS status_updated_at,
    h.delivery_status,
    h.delivery_method,
    h.delivery_mode_id,
    h.delivery_type,
    h.courier_name,
    h.tracking_number,
    h.sent_at,
    h.picked_up_at,
    h.delivered_at,
    h.delivery_updated_by,
    h.delivery_updated_at,
    h.proof_uploaded_by,
    h.proof_uploaded_at,
    true                            AS is_archived,
    h.archived_at,
    h.archived_by
  FROM order_history h;


CREATE OR REPLACE VIEW all_order_products AS
  SELECT
    op.order_id,
    op.sku,
    op.quantity,
    op.unit_price,
    op.cost_price,
    false AS is_archived
  FROM order_products op

  UNION ALL

  SELECT
    ohp.order_id,
    ohp.sku,
    ohp.quantity,
    ohp.unit_price,
    ohp.cost_price,
    true  AS is_archived
  FROM order_history_products ohp;


COMMENT ON VIEW all_orders IS
  'Read-only analytics union of orders (live) and order_history (archived). Use this for every report/dashboard query - never `orders` alone, or archived revenue is lost. Writers must keep using the base tables.';
COMMENT ON VIEW all_order_products IS
  'Read-only analytics union of order_products and order_history_products. Pairs with all_orders.';
