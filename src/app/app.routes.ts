import { Routes } from '@angular/router';
import { NotFound } from './components/not-found/not-found';
import { GBVManagement } from './pages/gbv/gbv-management/gbv-management';
import { NonGbvManagement } from './pages/non-gbv/non-gbv-management/non-gbv-management';
import { GrievancesStatusReport } from './pages/grievances-status-report/grievances-status-report';
import { ExcelImporting } from './pages/excel-importing/excel-importing';
import { Profile } from './pages/profile/profile';
import { routeGuard } from './route.guard';
import { NonGbvList } from './pages/non-gbv/non-gbv-list/non-gbv-list';
import { NonGbvDetails } from './pages/non-gbv/non-gbv-details/non-gbv-details';
import { NonGbvProcessList } from './pages/non-gbv/non-gbv-process-list/non-gbv-process-list';
import { NonGbvProcessDetails } from './pages/non-gbv/non-gbv-process-details/non-gbv-process-details';
import { GbvList } from './pages/gbv/gbv-list/gbv-list';
import { GbvDetails } from './pages/gbv/gbv-details/gbv-details';
import { GbvProcessList } from './pages/gbv/gbv-process-list/gbv-process-list';
import { GbvProcessDetails } from './pages/gbv/gbv-process-details/gbv-process-details';
import { GrievanceDashboard } from './pages/grievance-dashboard/grievance-dashboard';

import { GeoBasedSummaryReport } from './pages/grm-report/geo-based-summary-report/geo-based-summary-report';
import { GeoBasedDetailReport } from './pages/grm-report/geo-based-detail-report/geo-based-detail-report';
import { ReferrerBasedSummaryReport } from './pages/grm-report/referrer-based-summary-report/referrer-based-summary-report';
import { AnalyticalReport } from './pages/grm-report/analytical-report/analytical-report';

export const routes: Routes = [
  {
    component: GrievanceDashboard,
    path: 'dashboard',
    canActivate: [routeGuard],
  },
  {
    component: GrievanceDashboard,
    path: 'grievance-dashboard',
    canActivate: [routeGuard],
  },
  {
    path: 'gbv-management',
    children: [
      {
        path: 'issue-entry',
        component: GBVManagement,
      },
      {
        path: 'list',
        component: GbvList,
      },
      {
        path: 'process',
        component: GbvProcessList,
      },
      {
        path: 'details/:id',
        component: GbvDetails,
      },
      {
        path: 'process-details/:id',
        component: GbvProcessDetails,
      },
    ],
  },
  {
    path: 'non-gbv-management',
    children: [
      {
        path: 'issue-entry',
        component: NonGbvManagement,  
      },
      {
        path: 'list',
        component: NonGbvList,
       
      },
      {
        path: 'process',
        component: NonGbvProcessList,
       
      },
      {
        path: 'details',
        component: NonGbvDetails,
      },
      {
        path: 'details/:id',
        component: NonGbvDetails,
      },
         {
        path: 'process-details',
        component: NonGbvProcessDetails,
      },
      {
        path: 'process-details/:id',
        component: NonGbvProcessDetails,
      },
    ],
  },

  {
    component: NonGbvManagement,
    path: 'non-gbv-management',
  },
  {
    path: 'grm-report',
    children: [
      {
        path: 'geo-based-summary',
        component: GeoBasedSummaryReport,
      },
      {
        path: 'geo-based-detail',
        component: GeoBasedDetailReport,
      },
      {
        path: 'referrer-based-summary',
        component: ReferrerBasedSummaryReport,
      },
      {
        path: 'analytical',
        component: AnalyticalReport,
      },
    ],
  },
  {
    component: GrievancesStatusReport,
    path: 'grievances-status-report',
  },
  {
    component: ExcelImporting,
    path: 'excel-importing',
  },
  {
    component: Profile,
    path: 'profile',
  },

  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    component: NotFound,
    path: '**',
  },
];
