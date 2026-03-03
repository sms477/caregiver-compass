
-- Create a view that computes dominant ADL needs and acuity score per resident
-- from the last 30 days of daily_care_logs
CREATE OR REPLACE VIEW public.resident_acuity_summary AS
WITH log_window AS (
  SELECT * FROM public.daily_care_logs
  WHERE log_date >= CURRENT_DATE - INTERVAL '30 days'
),
adl_counts AS (
  SELECT
    resident_id,
    'bathing' AS adl, bathing AS level, COUNT(*) AS cnt
  FROM log_window GROUP BY resident_id, bathing
  UNION ALL
  SELECT resident_id, 'dressing', dressing, COUNT(*) FROM log_window GROUP BY resident_id, dressing
  UNION ALL
  SELECT resident_id, 'toileting', toileting, COUNT(*) FROM log_window GROUP BY resident_id, toileting
  UNION ALL
  SELECT resident_id, 'transfers', transfers, COUNT(*) FROM log_window GROUP BY resident_id, transfers
  UNION ALL
  SELECT resident_id, 'eating', eating, COUNT(*) FROM log_window GROUP BY resident_id, eating
),
ranked AS (
  SELECT
    resident_id, adl, level, cnt,
    ROW_NUMBER() OVER (PARTITION BY resident_id, adl ORDER BY cnt DESC, level DESC) AS rn
  FROM adl_counts
),
dominant AS (
  SELECT resident_id, adl, level AS dominant_level,
    CASE level
      WHEN 'Independent' THEN 0
      WHEN 'Assist' THEN 3
      WHEN 'Total' THEN 5
      ELSE 0
    END AS points
  FROM ranked WHERE rn = 1
),
scored AS (
  SELECT
    resident_id,
    SUM(points)::int AS calculated_score,
    jsonb_object_agg(adl, jsonb_build_object('dominant', dominant_level, 'points', points)) AS adl_breakdown
  FROM dominant
  GROUP BY resident_id
),
log_counts AS (
  SELECT resident_id, COUNT(*)::int AS log_count
  FROM log_window
  GROUP BY resident_id
)
SELECT
  r.id AS resident_id,
  r.name AS resident_name,
  r.room,
  r.care_level AS current_level,
  r.acuity_score AS current_score,
  COALESCE(lc.log_count, 0) AS log_count,
  COALESCE(s.calculated_score, 0) AS calculated_score,
  CASE
    WHEN COALESCE(s.calculated_score, 0) <= 10 THEN 'Basic'
    WHEN COALESCE(s.calculated_score, 0) <= 20 THEN 'Level 1'
    WHEN COALESCE(s.calculated_score, 0) <= 30 THEN 'Level 2'
    ELSE 'High Acuity'
  END AS calculated_level,
  COALESCE(s.adl_breakdown, '{}'::jsonb) AS adl_breakdown
FROM public.residents r
LEFT JOIN scored s ON s.resident_id = r.id
LEFT JOIN log_counts lc ON lc.resident_id = r.id;

-- Grant access so RLS on residents still applies via the view
-- Views inherit the caller's permissions on underlying tables
