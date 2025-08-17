-- Insert default board columns for new boards
INSERT INTO board_columns (board_id, name, position, color) 
SELECT 
  b.id,
  col.name,
  col.position,
  col.color
FROM boards b
CROSS JOIN (
  VALUES 
    ('To Do', 0, '#ef4444'),
    ('In Progress', 1, '#f59e0b'),
    ('Review', 2, '#3b82f6'),
    ('Done', 3, '#10b981')
) AS col(name, position, color)
WHERE NOT EXISTS (
  SELECT 1 FROM board_columns bc WHERE bc.board_id = b.id
);
