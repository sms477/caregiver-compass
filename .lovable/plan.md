

## Plan: Add Upcoming Tours Widget to Operations Dashboard

### What
Add an "Upcoming Tours" card to the dashboard's right sidebar (alongside Compliance Deadlines and Revenue Watch) that shows the next few scheduled tours from the `tours` table, with prospect name, date/time, and assigned staff.

### Changes

**File: `src/components/admin/AdminDashboardHome.tsx`**

1. **Data fetching** — Add a query for upcoming tours in the existing `Promise.all`:
   ```sql
   tours.select("id, scheduled_at, status, assigned_staff_name, prospect_id, prospects(name)")
     .eq("status", "scheduled")
     .gte("scheduled_at", now)
     .order("scheduled_at")
     .limit(5)
   ```

2. **State** — Add `upcomingTours` to the `DashboardData` interface with fields: `id`, `prospect_name`, `scheduled_at`, `assigned_staff_name`.

3. **UI** — Insert a new card in the right sidebar (line ~490, `lg:col-span-3` section) above or below Compliance Deadlines:
   - Header: Calendar icon + "Upcoming Tours" + "View All" link → `onNavigate("crm")`
   - Empty state: "No upcoming tours scheduled."
   - List: Each tour shows prospect name, formatted date/time (`format(date, "EEE, MMM d · h:mm a")`), and optional staff name badge
   - Max 5 items shown

4. **Import** — Add `Calendar` from lucide-react (already imported in other files).

### No database changes needed
The `tours` table already exists with the required columns.

