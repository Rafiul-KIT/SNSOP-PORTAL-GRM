import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { NotFound } from './components/not-found/not-found';
import { GBVManagement } from './pages/gbv-management/gbv-management';
import { NonGbvManagement } from './pages/non-gbv/non-gbv-management/non-gbv-management';
import { GrievancesStatusReport } from './pages/grievances-status-report/grievances-status-report';
import { ExcelImporting } from './pages/excel-importing/excel-importing';
import { Profile } from './pages/profile/profile';
import { routeGuard } from './route.guard';
import { NonGbvList } from './pages/non-gbv/non-gbv-list/non-gbv-list';
import { NonGbvDetails } from './pages/non-gbv/non-gbv-details/non-gbv-details';
import { NonGbvProcessList } from './pages/non-gbv/non-gbv-process-list/non-gbv-process-list';
import { NonGbvProcessDetails } from './pages/non-gbv/non-gbv-process-details/non-gbv-process-details';

export const routes: Routes = [
  {
    component: Dashboard,
    path: 'dashboard',
    canActivate: [routeGuard],
  },
  {
    component: GBVManagement,
    path: 'gbv-management',
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
        path: 'process-details',
        component: NonGbvProcessDetails,
      },
    ],
  },

  {
    component: NonGbvManagement,
    path: 'non-gbv-management',
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
