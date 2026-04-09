import { ChangeDetectorRef, Component, effect } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { MenubarModule } from 'primeng/menubar';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-header',
  imports: [RouterModule, ButtonModule, PopoverModule, MenubarModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class Header {
  showPortalOptions = false;
  showUsermenu = false;
  menuList: any[] = [];
  userInfo: any = null;
  menusLoaded = false; // ✅ controls when to render

  portalList = [
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
    { label: 'GRM',
      link: environment.portals.grm,
      icon: 'fas fa-sitemap' },
    {
      label: 'Report',
      link: environment.portals.report,
      icon: 'fas fa-chart-line',
    },
    {
      label: 'Settings',
      link: environment.portals.masterSettings,
      icon: 'fas fa-cog',
    },
    {
      label: 'Survey CTO',
      link: environment.portals.surveyCTO,
      icon: 'fas fa-poll',
    },
      { label: 'Monitoring & Evaluation',
      link: environment.portals.mNe,
      icon: 'fas fa-chart-bar'
    },
  ];

  constructor(
    private router: Router,
    private apiService: ApiService,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef,
  ) {
    // Watch login state and load menus dynamically
    effect(() => {
      this.userInfo = this.apiService.loginState()?.user;
      if (this.userInfo?.roleId) {
        this.loadMenusForUser(this.userInfo.roleId);
      }
    });
  }

  async loadMenusForUser(roleId: number) {
    try {
      const menus = sessionStorage.getItem(`menus_${roleId}`);
      if (menus) {
        const responseData = JSON.parse(menus);

        // Handle empty response
        if (responseData.length === 0) {
          console.warn(`No menus found for role ${roleId}`);
          this.menuList = [];
          this.menusLoaded = true;
          this.cdRef.detectChanges();
          return;
        }

        const allowedNames = responseData.map((menu: any) => menu.name);
        const allMenus = this.getStaticMenus();

        // ✅ Update safely and trigger view refresh
        this.menuList = this.filterMenusByAccess(allMenus, allowedNames);
        this.menusLoaded = true;
        this.cdRef.detectChanges();
      } else {
        console.warn(`No menus found in sessionStorage for role ${roleId}`);
        this.menuList = [];
        this.menusLoaded = true;
        this.cdRef.detectChanges();
      }
    } catch (error) {
      console.error('Error loading menus:', error);
      this.menusLoaded = true;
      this.cdRef.detectChanges();
    }
  }

  getStaticMenus(): any[] {
    return [
      {
        label: 'Dashboard',
        icon: 'fas fa-tachometer-alt',
        routerLink: 'dashboard',
      },
      {
        label: 'GBV Grievances',
        icon: 'fas fa-balance-scale-right',
        items: [
          {
            label: 'GBV Management Issue Entry',
            icon: 'fas fa-plus',
            routerLink: 'gbv-management/issue-entry',
          },
          {
            label: 'GBV Grievances List',
            icon: 'fas fa-list',
            routerLink: 'gbv-management/list',
          },
          {
            label: 'GBV Grievances Process',
            icon: 'fas fa-list',
            routerLink: 'gbv-management/process',
          },
         
        ],
      },
      
       {
        label: 'Non GBV Grievances',
        icon: 'fas fa-balance-scale-left',
        items: [
          {
            label: 'Non GBV Management Issue Entry',
            icon: 'fas fa-plus',
            routerLink: 'non-gbv-management/issue-entry',
          },
          {
            label: 'Non GBV Grievances List',
            icon: 'fas fa-list',
            routerLink: 'non-gbv-management/list',
          },
           {
            label: 'Non GBV Grievances Process',
            icon: 'fas fa-list',
            routerLink: 'non-gbv-management/process',
          },
        ],
      },
     
      {
        label: 'GRM Report',
        icon: 'fas fa-file-alt',
        items: [
          {
            label: 'Geo-Based Summary Report',
            icon: 'fas fa-globe',
            routerLink: 'grm-report/geo-based-summary',
          },
          {
            label: 'Geo-Based Detail Report',
            icon: 'fas fa-map-marked-alt',
            routerLink: 'grm-report/geo-based-detail',
          },
          {
            label: 'Referrer-Based Summary Report',
            icon: 'fas fa-user-friends',
            routerLink: 'grm-report/referrer-based-summary',
          },
          {
            label: 'Analytical Report',
            icon: 'fas fa-chart-bar',
            routerLink: 'grm-report/analytical',
          },
        ],
      },
      {
        label: 'Grievances Status Report',
        icon: 'fas fa-bullhorn',
        routerLink: 'grievances-status-report',
      },
      // {
      //   label: 'Excel Importing',
      //   icon: 'fas fa-download',
      //   routerLink: 'excel-importing',
      // },


    ];
  }

  // ✅ Recursive filter: keep only allowed menus (parent and child)
  filterMenusByAccess(menus: any[], allowedNames: string[]): any[] {
    return menus
      .filter((menu) => allowedNames.includes(menu.label)) // filter parent menus
      .map((menu) => ({
        ...menu,
        // Recursively filter child menus if the parent is allowed
        items: menu.items
          ? this.filterMenusByAccess(menu.items, allowedNames)
          : undefined,
      }));
  }

  logout() {
    this.apiService.logout();
    window.location.href = `${environment.portals.master}/#/landing`;
  }
  goToProfile = () => {
    this.router.navigateByUrl('/profile');
  };
}
