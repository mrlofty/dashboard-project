# Dashboard Analytics Enhancement - Task 3 Partial

**Built:** 2026-03-20  
**Task:** Task 3 from sprint queue  
**Status:** 🚧 PARTIAL (pull script complete, UI enhancement needed)

## What's Built

### ✅ Complete
1. **`scripts/pull-analytics.py`** - Enhanced GA4 data pull script
   - Traffic source breakdown (organic, direct, social/Instagram, referral, email)
   - Week-over-week comparison for trend calculations
   - Top 5 pages per site
   - Calculates percentage change trends
   - Highlights AAD Instagram traffic in console output
   
## What's Needed

### 🚧 To Do
1. **Enhanced `analytics.html`** - Rebuild dashboard display with:
   - Per-site cards with sparkline/mini chart
   - Traffic source breakdown visualization
   - Trend arrows (↑/↓) with percentage change
   - AAD highlighted since Instagram just started
   - Modern design (make it a dashboard highlight)
   
2. **Cron job** - Add daily 6am analytics pull to cron schedule

## Usage

### Manual Pull
```bash
cd /home/adam/clawd/dashboard-project
python3 scripts/pull-analytics.py
```

### Requirements
```bash
pip install google-analytics-data
```

## Data Structure

The script outputs to `data/analytics.json`:

```json
{
  "lastUpdated": "2026-03-20T00:40:00",
  "sites": {
    "afteraliendisclosure.com": {
      "week": {
        "users": 5,
        "pageViews": 95,
        "sessions": 11
      },
      "lastWeek": {
        "users": 3,
        "pageViews": 60,
        "sessions": 8
      },
      "trends": {
        "users": 66.7,
        "pageViews": 58.3,
        "sessions": 37.5
      },
      "trafficSources": {
        "organic": 2,
        "direct": 5,
        "social": 3,
        "referral": 1,
        "email": 0
      },
      "topPages": [
        {"path": "/index.html", "views": 42},
        {"path": "/poll/", "views": 16}
      ]
    }
  }
}
```

## Instagram Traffic Detection

The script specifically looks for Instagram in source/medium and buckets it under "social". When AAD has Instagram traffic, it prints:
```
🛸 AAD Instagram traffic: 3 sessions this week!
```

## Next Steps

1. Build the enhanced analytics.html UI (high priority)
2. Add sparklines library (lightweight: https://github.com/omnipotent/sparkline or Chart.js)
3. Style per Hunter's design systems research (8pt grid, LCH colors, Vercel/Linear style)
4. Add cron job for daily 6am pull
5. Consider real-time dashboard refresh (fetch analytics.json every 5min?)

## Notes

- Pulls last 7 days vs previous 7 days for comparison
- Instagram traffic bucketed under "social" source
- Script ready for cron automation
- UI enhancement needed to make this visible in dashboard
