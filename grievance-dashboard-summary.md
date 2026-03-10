Grievance Dashboard API Summary                                                                                                                                                                                                       
  Endpoint                
  GET /api/grievance/dashboard
                         
  Response Structure

  The API returns dashboard data grouped by grievance type (NGBV = Non-GBV, GBV = Gender-Based Violence):

  {
    "ngbvData": {
      "grievancesByStatus": [{ "status": "string", "count": 0 }],
      "grievancesByType": [{ "type": "string", "count": 0 }],
      "grievancesByLocation": [{ "state": "...", "county": "...", "payam": "...", "boma": "...", "count": 0 }],
      "averageResolutionTimeByLocation": [{ "state": "...", "county": "...", "payam": "...", "boma": "...", "averageResolutionTime": 0.0 }]
    },
    "gbvData": {
      "grievancesByStatus": [{ "status": "string", "count": 0 }],
      "grievancesByLocation": [{ "state": "...", "county": "...", "payam": "...", "boma": "...", "count": 0 }],
      "averageResolutionTimeByLocation": [{ "state": "...", "county": "...", "payam": "...", "boma": "...", "averageResolutionTime": 0.0 }],
      "typesOfReferralMade": [{ "referralService": "string", "count": 0 }],
      "sentToReferralServices": [{ "title": "string", "count": 0 }],
      "perpetratorAssociatedWithProject": [{ "title": "string", "count": 0 }]
    }
  }

  Key Data Points

  ┌─────────────────────┬──────┬─────┐
  │       Metric        │ NGBV │ GBV │
  ├─────────────────────┼──────┼─────┤
  │ By Status           │ ✅   │ ✅  │
  ├─────────────────────┼──────┼─────┤
  │ By Location         │ ✅   │ ✅  │
  ├─────────────────────┼──────┼─────┤
  │ Avg Resolution Time │ ✅   │ ✅  │
  ├─────────────────────┼──────┼─────┤
  │ By Type             │ ✅   │ ❌  │
  ├─────────────────────┼──────┼─────┤
  │ Referral Types      │ ❌   │ ✅  │
  ├─────────────────────┼──────┼─────┤
  │ Sent to Referral    │ ❌   │ ✅  │
  ├─────────────────────┼──────┼─────┤
  │ Perpetrator Info    │ ❌   │ ✅  │
  └─────────────────────┴──────┴─────┘

  Location Hierarchy

  state → county → payam → boma (some fields may be null based on data granularity)
