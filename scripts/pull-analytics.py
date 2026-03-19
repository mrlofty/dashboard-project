#!/usr/bin/env python3
"""
Pull Google Analytics 4 data for dashboard
Fetches traffic metrics, sources, and trends for all tracked sites
"""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path

# GA4 API (requires google-analytics-data package)
try:
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunReportRequest,
    )
    from google.oauth2.service_account import Credentials
    GA4_AVAILABLE = True
except ImportError:
    GA4_AVAILABLE = False
    print("⚠️  google-analytics-data package not installed")
    print("   Install: pip install google-analytics-data")

def load_properties():
    """Load GA4 property IDs from config"""
    props_file = Path("/home/adam/clawd/dashboard-project/data/ga-properties.json")
    if not props_file.exists():
        return {}
    with open(props_file) as f:
        return json.load(f)

def get_client():
    """Initialize GA4 client with service account credentials"""
    creds_file = Path("/home/adam/.openclaw/ga-credentials.json")
    if not creds_file.exists():
        raise FileNotFoundError(f"GA credentials not found: {creds_file}")
    
    credentials = Credentials.from_service_account_file(str(creds_file))
    return BetaAnalyticsDataClient(credentials=credentials)

def parse_ga4_date(value):
    if not value:
        return ""
    if len(value) == 8 and value.isdigit():
        return f"{value[0:4]}-{value[4:6]}-{value[6:8]}"
    return value

def fetch_site_analytics(client, property_id, site_name):
    """Fetch analytics for a single site"""
    
    # Date ranges: this week and last week
    today = datetime.now().date()
    week_start = today - timedelta(days=7)
    last_week_start = week_start - timedelta(days=7)
    daily_start = today - timedelta(days=6)
    
    try:
        # Current week metrics
        request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[
                Dimension(name="pagePath"),
                Dimension(name="sessionSource"),
                Dimension(name="sessionMedium"),
            ],
            metrics=[
                Metric(name="activeUsers"),
                Metric(name="screenPageViews"),
                Metric(name="sessions"),
            ],
            date_ranges=[DateRange(
                start_date=week_start.strftime("%Y-%m-%d"),
                end_date=today.strftime("%Y-%m-%d")
            )],
        )
        
        response = client.run_report(request)
        
        # Process response
        total_users = 0
        total_views = 0
        total_sessions = 0
        top_pages = {}
        traffic_sources = {
            "organic": 0,
            "direct": 0,
            "social": 0,
            "referral": 0,
            "email": 0
        }
        
        for row in response.rows:
            users = int(row.metric_values[0].value) if row.metric_values else 0
            views = int(row.metric_values[1].value) if len(row.metric_values) > 1 else 0
            sessions = int(row.metric_values[2].value) if len(row.metric_values) > 2 else 0
            
            total_users += users
            total_views += views
            total_sessions += sessions
            
            # Track top pages
            if len(row.dimension_values) > 0:
                page = row.dimension_values[0].value
                if page not in top_pages:
                    top_pages[page] = 0
                top_pages[page] += views
            
            # Track traffic sources
            if len(row.dimension_values) > 2:
                source = row.dimension_values[1].value.lower()
                medium = row.dimension_values[2].value.lower()
                
                if "instagram" in source or "instagram" in medium:
                    traffic_sources["social"] += sessions
                elif medium == "organic":
                    traffic_sources["organic"] += sessions
                elif medium == "(none)" or source == "(direct)":
                    traffic_sources["direct"] += sessions
                elif medium == "referral":
                    traffic_sources["referral"] += sessions
                elif medium == "email":
                    traffic_sources["email"] += sessions

        # Daily trend: last 7 days
        daily_data = []
        try:
            request_daily = RunReportRequest(
                property=f"properties/{property_id}",
                dimensions=[Dimension(name="date")],
                metrics=[
                    Metric(name="activeUsers"),
                    Metric(name="screenPageViews"),
                ],
                date_ranges=[DateRange(
                    start_date=daily_start.strftime("%Y-%m-%d"),
                    end_date=today.strftime("%Y-%m-%d")
                )],
            )
            response_daily = client.run_report(request_daily)

            for row in response_daily.rows:
                date_value = ""
                if row.dimension_values:
                    date_value = parse_ga4_date(row.dimension_values[0].value)

                users = int(row.metric_values[0].value) if row.metric_values else 0
                views = int(row.metric_values[1].value) if len(row.metric_values) > 1 else 0

                daily_data.append({
                    "date": date_value,
                    "users": users,
                    "pageViews": views
                })
            daily_data.sort(key=lambda item: item["date"])
        except Exception as e:
            print(f"⚠️  Could not fetch daily analytics for {site_name}: {e}")
            daily_data = []
        
        # Get last week for comparison
        request_prev = RunReportRequest(
            property=f"properties/{property_id}",
            metrics=[
                Metric(name="activeUsers"),
                Metric(name="screenPageViews"),
                Metric(name="sessions"),
            ],
            date_ranges=[DateRange(
                start_date=last_week_start.strftime("%Y-%m-%d"),
                end_date=(week_start - timedelta(days=1)).strftime("%Y-%m-%d")
            )],
        )
        
        response_prev = client.run_report(request_prev)
        prev_users = sum(int(row.metric_values[0].value) for row in response_prev.rows) if response_prev.rows else 0
        prev_views = sum(int(row.metric_values[1].value) for row in response_prev.rows) if response_prev.rows else 0
        prev_sessions = sum(int(row.metric_values[2].value) for row in response_prev.rows) if response_prev.rows else 0
        
        # Calculate trends
        def calc_change(current, previous):
            if previous == 0:
                return 0 if current == 0 else 100
            return round(((current - previous) / previous) * 100, 1)
        
        # Format top pages
        top_pages_list = [
            {"path": path, "views": views}
            for path, views in sorted(top_pages.items(), key=lambda x: x[1], reverse=True)[:5]
        ]
        
        return {
            "week": {
                "users": total_users,
                "pageViews": total_views,
                "sessions": total_sessions
            },
            "lastWeek": {
                "users": prev_users,
                "pageViews": prev_views,
                "sessions": prev_sessions
            },
            "trends": {
                "users": calc_change(total_users, prev_users),
                "pageViews": calc_change(total_views, prev_views),
                "sessions": calc_change(total_sessions, prev_sessions)
            },
            "trafficSources": traffic_sources,
            "topPages": top_pages_list,
            "daily": daily_data
        }
        
    except Exception as e:
        print(f"⚠️  Error fetching analytics for {site_name}: {e}")
        return {
            "week": {},
            "lastWeek": {},
            "trends": {},
            "trafficSources": {},
            "topPages": [],
            "daily": []
        }

def main():
    """Pull analytics for all configured sites"""
    
    if not GA4_AVAILABLE:
        print("❌ Google Analytics Data API not available")
        return
    
    properties = load_properties()
    if not properties:
        print("❌ No GA4 properties configured")
        return
    
    client = get_client()
    
    analytics_data = {
        "lastUpdated": datetime.now().isoformat(),
        "sites": {}
    }
    
    for site_name, property_id in properties.items():
        print(f"📊 Fetching analytics for {site_name}...")
        analytics_data["sites"][site_name] = fetch_site_analytics(client, property_id, site_name)
    
    # Write to file
    output_file = Path("/home/adam/clawd/dashboard-project/data/analytics.json")
    with open(output_file, 'w') as f:
        json.dump(analytics_data, f, indent=2)
    
    print(f"✅ Analytics data updated: {output_file}")
    print(f"   {len(analytics_data['sites'])} sites processed")
    
    # Highlight AAD Instagram traffic if present
    if "afteraliendisclosure.com" in analytics_data["sites"]:
        aad = analytics_data["sites"]["afteraliendisclosure.com"]
        instagram = aad.get("trafficSources", {}).get("social", 0)
        if instagram > 0:
            print(f"   🛸 AAD Instagram traffic: {instagram} sessions this week!")

if __name__ == "__main__":
    main()
