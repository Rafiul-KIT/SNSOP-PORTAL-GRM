import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { NotFound } from './components/not-found/not-found';
import { GbvManagement } from './pages/gbv-management/gbv-management';
import { NonGbvManagement } from './pages/non-gbv-management/non-gbv-management';
import { GrievancesStatusReport } from './pages/grievances-status-report/grievances-status-report';
import { ExcelImporting } from './pages/excel-importing/excel-importing';
import { Profile } from './pages/profile/profile';

export const routes: Routes = [
  {
    component: Dashboard,
    path: 'dashboard',
  },
  {
    component: GbvManagement,
    path: 'gbv-management',
  },
  {
    component: NonGbvManagement,
    path: 'non-gbv-management',
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
