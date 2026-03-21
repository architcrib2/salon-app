# KaratOS Intelligence — Algorithm Reference

> **Who this is for:** Salon owners, sales staff, and anyone explaining the KaratOS Intelligence features to a prospective customer.
>
> Every number on every Intelligence screen is produced by a **deterministic, rule-based algorithm** written in pure Python. There is **no machine learning, no black box, no cloud AI service** — just clean maths on your own salon data. This means:
> - Results are 100% explainable. You can always trace a score back to a specific customer action.
> - Data never leaves your server.
> - Scores update every time the page loads — always fresh.

---

## Table of Contents

1. [Customer Intelligence](#1-customer-intelligence)
   - 1.1 [Churn Risk Score](#11-churn-risk-score)
   - 1.2 [Next Visit Prediction](#12-next-visit-prediction)
   - 1.3 [VIP Ranking](#13-vip-ranking)
   - 1.4 [Rebooking Opportunities](#14-rebooking-opportunities)
2. [Staff Intelligence](#2-staff-intelligence)
   - 2.1 [Performance Score](#21-performance-score)
   - 2.2 [Trend Analysis](#22-trend-analysis)
   - 2.3 [Specialization Index (HHI)](#23-specialization-index-hhi)
   - 2.4 [Workload Distribution](#24-workload-distribution)
3. [Inventory Intelligence](#3-inventory-intelligence)
   - 3.1 [Stockout Risk Score](#31-stockout-risk-score)
   - 3.2 [Dead Stock Detection](#32-dead-stock-detection)
   - 3.3 [Turnover Metrics](#33-turnover-metrics)
   - 3.4 [Smart Reorder Suggestions](#34-smart-reorder-suggestions)
4. [General Design Principles](#4-general-design-principles)

---

## 1. Customer Intelligence

### 1.1 Churn Risk Score

**What it answers:** "Which customers are about to stop coming forever, and why?"

**Score range:** 0 – 100 (higher = more likely to churn)

#### How the score is built

| Component | Max contribution | Logic |
|-----------|-----------------|-------|
| **Base score** | 50 pts | How far past their expected return window are they? |
| **Frequency penalty** | +20 pts | Overdue by 1.5× their usual gap |
| **Frequency penalty (severe)** | +30 pts cumulative | Overdue by 2× their usual gap |
| **Reliability penalty** | up to 20 pts | Proportion of appointments that were cancelled or no-shows |

```
expected_return = average_gap_between_visits   (if customer has 3+ visits)
               = 45 days                        (industry default for new customers)

base_score = min(50,  (days_since_last_visit / expected_return) × 50)

frequency_penalty:
  if days_since_last_visit > expected_return × 1.5  → +20
  if days_since_last_visit > expected_return × 2.0  → +30 more  (total +50)

reliability_penalty = (cancelled + no_show) / total_appointments  × 20

churn_score = min(100,  base_score + frequency_penalty + reliability_penalty)
```

#### Risk bands

| Band | Score range | Plain English |
|------|------------|---------------|
| **Healthy** | 0 – 30 | Visiting on schedule, nothing to worry about |
| **At Risk** | 31 – 60 | Starting to drift — a gentle nudge is enough |
| **High Risk** | 61 – 80 | Significantly overdue — act now |
| **Churned** | 81 – 100 | Almost certainly gone — recovery campaign needed |

#### Real example
A customer visits every 28 days on average. She last came in 70 days ago and has cancelled once in 8 appointments.

```
base_score = min(50, (70 / 28) × 50) = min(50, 125) = 50
frequency_penalty: 70 > 28×1.5=42 → +20; 70 > 28×2=56 → +30  → total +50
reliability_penalty = (1/8) × 20 = 2.5
churn_score = min(100, 50 + 50 + 2.5) = 100  → "Churned"
```

The screen would show: *"No visit in 70 days against usual 28-day pattern"*

---

### 1.2 Next Visit Prediction

**What it answers:** "When is this customer most likely to come in next, and how confident are we?"

#### Algorithm

The system computes the gap (in days) between every pair of consecutive completed appointments for each customer, then predicts the next one.

```
intervals = [gap_1, gap_2, ..., gap_n]   (days between consecutive visits)

if total_visits < 2:
    predicted_gap = 45 days    (Indian salon industry default)
    confidence    = "low"

elif total_visits 2–4:
    predicted_gap = median(intervals)
    confidence    = "medium"

else (5+ visits):
    last5   = last 5 intervals
    weights = [1, 2, 3, 4, 5]   (more recent gaps get higher weight)
    predicted_gap = weighted_average(last5, weights)
    confidence    = "high"

predicted_next_date = last_visit_date + predicted_gap days
```

**Why weighted average for frequent visitors?** Recent behaviour matters more than old. If someone used to come monthly but has shifted to bi-weekly, the weighted average catches that shift faster than a simple average would.

#### Status labels

| Status | Rule | Action recommended |
|--------|------|--------------------|
| **Upcoming** | predicted_next > today + 7 days | No action needed |
| **Due Soon** | predicted_next is within 7 days | Optional pre-booking reminder |
| **Overdue** | predicted_next has already passed | Book now, offer incentive |

---

### 1.3 VIP Ranking

**What it answers:** "Who are our most valuable customers, across every dimension that matters?"

**Score range:** 0 – 100 (higher = more valuable)

#### Five-dimension scoring

| Dimension | Weight | Formula |
|-----------|--------|---------|
| **Revenue** | 35 pts | `(this_customer_lifetime_revenue / highest_in_salon) × 35` |
| **Frequency** | 25 pts | `(this_customer_total_visits / most_visits_in_salon) × 25` |
| **Recency** | 20 pts | `max(0, (1 − days_since_last_visit / 180)) × 20` |
| **Loyalty Points** | 10 pts | `(this_customer_points / highest_points_in_salon) × 10` |
| **Referrals** | 10 pts | `min(10, referrals_made × 2)` — 5 referrals = full 10 pts |

**Key design decisions:**

- **Revenue and frequency are relative** (compared to your own customer base), not absolute. A salon with ₹500 average visits and one with ₹5,000 average visits both produce fair rankings within their own data.
- **Recency decays over 180 days.** A customer who visited today gets full 20 points. One who visited 90 days ago gets 10 points. One who visited 180+ days ago gets 0.
- **Referrals are capped at 5** (= 10 pts) so a single hyper-referrer cannot dominate.

#### VIP Tiers

| Tier | Score | Perks suggestion |
|------|-------|-----------------|
| **Platinum** | 80 – 100 | Priority booking, birthday gift, personal thank-you call |
| **Gold** | 60 – 79 | Loyalty bonus, early access to new services |
| **Silver** | 40 – 59 | Occasional reward, upsell opportunities |
| **Regular** | 0 – 39 | Standard experience, focus on retention |

---

### 1.4 Rebooking Opportunities

**What it answers:** "Which overdue or nearly-due customers should the receptionist call *today*, and in what order?"

This tab takes the output of Next Visit Prediction (§1.2) and ranks only customers who are **overdue** or **due within 7 days**, ordered by rebooking value.

#### Score formula (0–100)

| Component | Max | Logic |
|-----------|-----|-------|
| **Urgency** | 40 pts | How overdue are they? |
| **Reliability** | 30 pts | How often do they actually show up? |
| **Spend** | 20 pts | How much do they spend per visit (vs. your best customer)? |
| **Engagement** | 10 pts | Signal that they're still engaged with the salon |

```
urgency_score:
  overdue 0–7 days   → 40
  overdue 8–14 days  → 30
  due within 0–7 days → 25
  overdue 15–30 days → 15
  overdue 30+ days   → 5

reliability_score = (1 − bad_rate) × 30
  where bad_rate = (cancellations + no_shows) / total_appointments

spend_score = (avg_spend_per_visit / highest_avg_spend_in_candidate_list) × 20

engagement_score:
  +5  received a WhatsApp notification in last 90 days
  +3  has an active membership
  +2  has referred at least one person

rebooking_score = urgency + reliability + spend + engagement
```

**Why not just sort by "most overdue"?** A customer who is 20 days overdue and spends ₹3,000 per visit and always shows up is worth more than one who is 30 days overdue but cancels 40% of the time and spends ₹400. The score captures that.

Each row also shows a **Suggested Action** string, e.g.:
*"Call today — overdue 12 days, avg spend ₹1,800, reliable customer"*

---

## 2. Staff Intelligence

### 2.1 Performance Score

**What it answers:** "How good is each stylist overall, measured across everything that matters?"

**Score range:** 0 – 100

#### Four-dimension formula

| Dimension | Weight | Formula |
|-----------|--------|---------|
| **Revenue** | 35 pts | `(this_stylist_lifetime_revenue / highest_in_team) × 35` |
| **Completion Rate** | 30 pts | `(completed_appointments / total_appointments) × 30` |
| **Customer Retention** | 20 pts | `(customers_who_returned_to_this_stylist_2+_times / unique_customers_served) × 20` |
| **Efficiency** | 15 pts | `(this_stylist_avg_revenue_per_visit / highest_in_team) × 15` |

```
performance_score = revenue_score + completion_score + retention_score + efficiency_score
```

**Why retention is per-stylist, not per-salon:** A customer who comes back to the salon but always books with a different stylist does not count as a retention win for the first stylist. This measures genuine personal loyalty.

#### Performance Tiers

| Tier | Score | Meaning |
|------|-------|---------|
| **Star** | 75 – 100 | Top performer; anchor the team, mentor others |
| **Strong** | 55 – 74 | Solid and reliable; needs targeted growth nudge |
| **Average** | 35 – 54 | Developing; needs coaching on weakest dimension |
| **Developing** | 0 – 34 | Needs immediate support and clear improvement plan |

The **Score Breakdown** pills on each row show exactly how many points came from each dimension, so you can say to a stylist: "You scored 31/35 on revenue but only 8/20 on retention — let's work on building your regular clients."

---

### 2.2 Trend Analysis

**What it answers:** "Is each stylist getting better or worse compared to last month?"

#### Method

The system looks at two 30-day windows:
- **Current period:** last 30 days (today − 29 days → today)
- **Previous period:** 30 days before that (today − 59 days → today − 30 days)

```
revenue_change_pct  = ((current_revenue − previous_revenue) / previous_revenue) × 100
appointment_change_pct = ((current_appointments − previous_appointments) / previous_appointments) × 100

trend:
  "up"     if revenue_change_pct > +5%
  "down"   if revenue_change_pct < −5%
  "stable" otherwise
```

**Sparkline:** A 14-day daily revenue chart is also computed. Each point is the total revenue billed with that stylist on a given day. This gives the visual trend at a glance.

---

### 2.3 Specialization Index (HHI)

**What it answers:** "Is this stylist a specialist who excels at one thing, or a generalist who does everything equally?"

This uses the **Herfindahl-Hirschman Index (HHI)**, the same metric used in economics to measure market concentration.

#### How HHI is calculated

```
For each stylist, look at all their InvoiceItems (every service ever billed):

service_share_i = count_of_service_i / total_services_performed

HHI = sum(service_share_i²)   for all services
```

**Examples:**
- A stylist who does nothing but haircuts: `HHI = 1.0²  = 1.0` (pure specialist)
- A stylist split evenly across 4 services: `HHI = (0.25² × 4) = 0.25` (generalist)
- A stylist doing mostly colour with some cuts: `HHI ≈ 0.65 + 0.10 + ... ≈ 0.55` (focused)

#### Profile labels

| Profile | HHI range | What it means |
|---------|-----------|---------------|
| **Specialist** | ≥ 0.60 | Deep expertise in 1–2 services; great for upselling that service |
| **Focused** | 0.35 – 0.59 | Strong in a few services with some variety |
| **Generalist** | < 0.35 | Comfortable with everything; ideal for busy walk-in shifts |

The table also shows **Top 5 services by count** and **Top 5 by revenue** so you can see if a stylist's most popular service is also their most profitable one.

---

### 2.4 Workload Distribution

**What it answers:** "When is each stylist busiest, and how fully are they being utilised?"

#### Data

Appointments from the **last 90 days** (completed or scheduled).

#### Capacity utilisation

```
capacity_90d = (90 × 6/7) × 6
             = ~77 working days × 6 slots per day
             = ~462 slots

utilization_pct = (actual_appointments_90d / capacity_90d) × 100
```

The 6/7 factor assumes a 6-day work week. The 6 slots assumption is one appointment per hour across a 6-hour productive day — adjust this in `staff_algorithms.py` if your salon runs a different model.

#### Visualisations provided

- **Day-of-week bar chart** — see which day each stylist gets the most bookings (Mon–Sun)
- **Hour-of-day heatmap** — a strip from 9 am to 9 pm showing appointment density per hour

These two together answer: "Should I roster this stylist on Saturday or Sunday? And do they get more bookings in the morning or afternoon?"

---

## 3. Inventory Intelligence

### 3.1 Stockout Risk Score

**What it answers:** "Which products will run out soon and how urgently do we need to reorder?"

**Score range:** 0 – 100 (higher = more urgent)

#### Algorithm

```
consumed_30d = total units consumed (usage + wastage transactions) in the last 30 days
avg_daily_consumption = consumed_30d / 30
days_until_stockout = current_stock / avg_daily_consumption  (undefined if no consumption)
```

#### Base score from days-until-stockout

| Days until stockout | Score | Band |
|--------------------|-------|------|
| Already at 0 or negative | 100 | critical |
| 0 – 3 days | 95 | critical |
| 4 – 7 days | 80 | high |
| 8 – 14 days | 60 | medium |
| 15 – 30 days | 35 | low |
| 30+ days | 10 | low |
| No consumption data | 5 | low |

**Reorder-level bonus:** If the current stock is at or below the configured reorder level, +10 is added to the score (capped at 100). This catches slow-moving products that are still technically above zero but already below safe threshold.

---

### 3.2 Dead Stock Detection

**What it answers:** "Which products are sitting on the shelf costing us money but never being used?"

#### Method

For each product with stock > 0, the system finds the **date of the last negative inventory transaction** (any usage, wastage, or adjustment that reduced stock). The gap between that date and today determines the status.

```
days_idle = today − last_negative_transaction_date
```

| Days idle | Status | Dead score | Meaning |
|-----------|--------|-----------|---------|
| 0 – 30 | **Active** | 0 | Normal movement |
| 31 – 60 | **Slow Moving** | 30 | Monitor closely |
| 61 – 90 | **Stagnant** | 60 | Consider promotion or return |
| 91+ days | **Dead Stock** | 90 | Return to supplier or write off |
| Never used | **Never Used** | 90 | Was purchased but never opened |

#### Capital Tied

```
capital_tied = current_stock × cost_price
```

Items are sorted by capital_tied descending — the most expensive idle stock appears first, because that's where the financial pain is greatest.

The **total dead capital** figure at the top of the tab shows the total rupee value locked in slow/dead/stagnant inventory. This is money that could have been spent on fast-moving products.

---

### 3.3 Turnover Metrics

**What it answers:** "How efficiently is each product moving through the salon relative to what's on the shelf?"

#### Turnover Rate

```
usage_30d   = units consumed (usage transactions only) in last 30 days
wastage_30d = units wasted in last 30 days

net_change_30d  = sum of ALL transaction quantities in last 30 days
opening_stock   = current_stock − net_change_30d     (approximate)
avg_stock       = (opening_stock + current_stock) / 2  (average inventory held)

turnover_rate   = usage_30d / avg_stock
```

Using the average stock (rather than just current stock) avoids overstating turnover for products that were just restocked.

#### Speed classification

| Turnover rate | Speed | Meaning |
|--------------|-------|---------|
| ≥ 0.50 | **Fast Mover** | Using more than half the average stock every month |
| 0.20 – 0.49 | **Medium Mover** | Healthy, steady consumption |
| 0.01 – 0.19 | **Slow Mover** | Low usage — check if it's a seasonal product or can be phased out |
| 0 | **No Movement** | Not consumed at all in 30 days |

#### Wastage Rate

```
wastage_rate_pct = wastage_30d / (usage_30d + wastage_30d) × 100
```

A wastage rate above ~10% for any product is worth investigating — it may indicate over-ordering, storage issues, or a service that uses more product than estimated.

#### Category Rollups

The **Category cards** aggregate all products by category (e.g., Colour, Shampoo, Treatment) to show total consumption value, total wastage, and wastage rate for the category — useful for buying decisions.

---

### 3.4 Smart Reorder Suggestions

**What it answers:** "Exactly what should we order, how much of it, and when do we need to order by?"

#### Inclusion criteria — a product is included if:

```
current_stock ≤ reorder_level
  OR
(avg_daily_consumption > 0  AND  days_until_stockout < 30)
```

Products with no consumption and stock above reorder level are excluded — there is nothing to do for them.

#### Suggested order quantity

```
option_a = avg_daily_consumption × 45 − current_stock   (buy a 45-day supply buffer)
option_b = reorder_level × 1.5 − current_stock           (bring stock to 150% of reorder level)

suggested_order_qty = max(option_a, option_b, 1)   (always at least 1 unit)
```

The 45-day buffer means you will not need to reorder again for 6 weeks — sized to cover one full monthly order cycle plus 50% safety margin.

#### Priority

| Priority | Condition |
|----------|-----------|
| **Urgent** | Stock is at 0, or days_until_stockout ≤ 7 |
| **Soon** | Stock ≤ reorder_level, or days_until_stockout ≤ 14 |
| **Plan** | days_until_stockout between 14 and 30 |

#### Reorder-by Date

```
days_to_reorder_level = (current_stock − reorder_level) / avg_daily_consumption
reorder_by_date       = today + days_to_reorder_level
```

This tells you the **latest date you can wait** before placing the order, assuming your supplier can deliver within 1 day. If your supplier takes longer, factor that in manually.

#### Print Purchase Order

The **Print PO** button generates a clean, formatted purchase order page with all supplier names, quantities, and the total estimated cost — ready to send or print.

---

## 4. General Design Principles

### Why no machine learning?

KaratOS Intelligence uses **formula-based algorithms** instead of ML for deliberate reasons:

1. **Explainability.** Every score can be traced to a formula and a data point. You can explain to any customer exactly why they received a particular risk score.
2. **No training data required.** ML models need thousands of examples to be useful. Your salon may have 200–2,000 customers — not enough for reliable ML, but perfectly sufficient for these formulas.
3. **Instant updates.** There is no model to retrain. Every API call recomputes from the latest data.
4. **Privacy.** All computation happens on your own server. Nothing is sent to a third-party AI service.

### All scores are relative within your salon

Revenue scores, VIP scores, and performance scores compare each entity (customer, stylist, product) against the **best in your own data**, not against industry benchmarks. This means:
- A salon with ₹500 average tickets gets fair rankings among its own customers.
- A solo stylist gets a fair performance score relative to themselves over time.
- As your best customer or stylist improves, the whole ranking adjusts.

### Data sources

All data comes exclusively from your KaratOS database:

| Feature | Data used |
|---------|-----------|
| Churn Risk | `Appointment` (status, dates), `Customer` (last_visit, created_at) |
| Next Visit | `Appointment` (completed, scheduled_at) |
| VIP Score | `Invoice` (total_amount), `Appointment` (count), `Customer` (loyalty_points, referred_by) |
| Rebooking | All of the above + `WhatsAppNotification`, `CustomerMembership` |
| Staff Performance | `Appointment` (status, stylist), `InvoiceItem` (price, stylist) |
| Staff Trends | `Appointment` + `InvoiceItem` filtered by date range |
| Specializations | `InvoiceItem` + `Service` (name, per stylist) |
| Workload | `Appointment` (scheduled_at, per stylist, last 90d) |
| Stockout Risk | `InventoryTransaction` (usage/wastage last 30d), `Product` (stock, reorder_level) |
| Dead Stock | `InventoryTransaction` (last negative transaction date), `Product` (cost_price) |
| Turnover | `InventoryTransaction` (all types last 30d), `Product` |
| Smart Reorder | `InventoryTransaction` (usage/wastage last 30d), `Product` (reorder_level, cost_price, supplier) |

---

*Algorithm source files:*
- *Customer Intelligence:* `backend/apps/analytics/algorithms.py`
- *Staff Intelligence:* `backend/apps/analytics/staff_algorithms.py`
- *Inventory Intelligence:* `backend/apps/analytics/inventory_algorithms.py`
- *API views:* `backend/apps/analytics/views.py`
