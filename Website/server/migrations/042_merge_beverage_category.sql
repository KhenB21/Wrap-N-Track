-- Products were tagged with both "Beverage" (singular, 5 items) and "Beverages"
-- (plural, 7 items) for the same category, so the Inventory page's category
-- filter showed them as two separate options. Standardize on "Beverages" to
-- match the plural convention used by the other categories (Gift Boxes, Gift
-- Sets, Office Supplies, Wrapping Supplies, etc.) and because it already had
-- more items.

UPDATE inventory_items
SET category = 'Beverages'
WHERE category = 'Beverage';
