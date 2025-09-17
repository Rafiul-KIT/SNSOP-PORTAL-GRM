import { Component, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { MenubarModule } from 'primeng/menubar';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-header',
  imports: [RouterModule, ButtonModule, PopoverModule, MenubarModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  showPortalOptions: boolean = false;
  showUsermenu: boolean = false;
  portalList: any = [];
  menuList: any = [];
  userMenuList: any = [];

  constructor(private router: Router) {
    this.portalList = [
      {
        label: 'Dashboard',
        link: environment.portals.master,
        icon: 'fas fa-dashboard',
      },
      {
        label: 'Beneficiary',
        link: environment.portals.beneficiary,
        icon: 'fas fa-user-friends',
      },
      {
        label: 'Payment',
        link: environment.portals.payment,
        icon: 'fas fa-credit-card',
      },
      { label: 'GRM', link: environment.portals.grm, icon: 'fas fa-sitemap' },
      {
        label: 'Report',
        link: environment.portals.report,
        icon: 'fas fa-chart-line',
      },
    ];

    this.menuList = [
      {
        label: 'Non-GBV Grievances',
        icon: 'fas fa-list',
        routerLink: 'grievances/non-gbv',
        routerLinkActiveOptions: 'active',
      },
      {
        label: 'GBV Grievances',
        icon: 'fas fa-list',
        routerLink: 'grievances/gbv',
        routerLinkActiveOptions: 'active',
      },
      {
        label: 'Non-GBV Dashboard',
        icon: 'fas fa-list',
        routerLink: 'grievances/non-gbv-dashboard',
        routerLinkActiveOptions: 'active',
      },
      {
        label: 'GBV Dashboard',
        icon: 'fas fa-list',
        routerLink: 'grievances/gbv-dashboard',
        routerLinkActiveOptions: 'active',
      },
      {
        label: 'Grievances Status Report',
        icon: 'fas fa-list',
        routerLink: 'grievances/status-report',
        routerLinkActiveOptions: 'active',
      },
      {
        label: 'Excel Importing',
        icon: 'fas fa-list',
        routerLink: 'grievances/excel-importing',
        routerLinkActiveOptions: 'active',
      },
    ];
  }

  goToProfile = () => {
    window.location.href = `${environment.portals.master}/home/profile`;
  };

  logout = () => {};
}
