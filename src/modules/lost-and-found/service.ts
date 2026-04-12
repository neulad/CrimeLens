// Lost-and-found service — implemented in Week 6/7.
// listItems(): SELECT * FROM lost_items ORDER BY created_at DESC.
// createItem(data, userId): INSERT into lost_items.
// deleteItem(id, userId): DELETE WHERE id=$1 AND user_id=$2 (ownership check).
export {};
