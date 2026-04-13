import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Loader } from '../../../components/loader/loader';
import { ItSupportService, ITRequest } from '../../../services/it-support.service';

@Component({
  selector: 'app-help-desk-dashboard',
  standalone: true,
  imports: [CommonModule, BreadcrumbModule, TableModule, ButtonModule, TagModule, Loader],
  templateUrl: './help-desk-dashboard.html',
  styleUrls: ['./help-desk-dashboard.scss']
})
export class HelpDeskDashboard implements OnInit {
  breadcrumbHome = { icon: 'fas fa-home', routerLink: '/' };
  breadcrumbItems = [{ label: 'Help Desk' }, { label: 'Dashboard' }];

  isLoading = false;
  stats = {
    totalRequests: 0,
    newRequests: 0,
    inProgress: 0,
    resolved: 0,
    slaBreached: 0
  };

  recentTickets: ITRequest[] = [];
  quickInsights = {
    avgResolution: '--',
    reopened: 0,
    userRating: '--',
    activeAgents: 0
  };

  notifications: string[] = [];

  constructor(
    private router: Router,
    private itSupportService: ItSupportService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  private detectChanges(): void {
    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  async loadDashboardData(): Promise<void> {
    this.isLoading = true;
    this.detectChanges();

    this.zone.runOutsideAngular(async () => {
      try {
        const result = await this.itSupportService.getRequests({ size: 20 });
        const requests = result.items;

        this.zone.run(() => {
          this.recentTickets = requests.slice(0, 5);

          this.stats.totalRequests = result.total;
          this.stats.newRequests = requests.filter((r) => r.status?.toLowerCase() === 'new').length;
          this.stats.inProgress = requests.filter(
            (r) => r.status?.toLowerCase() === 'processing' || r.status?.toLowerCase() === 'required_more_info'
          ).length;
          this.stats.resolved = requests.filter(
            (r) => r.status?.toLowerCase() === 'resolved' || r.status?.toLowerCase() === 'closed'
          ).length;
          this.stats.slaBreached = 0;

          this.quickInsights.reopened = requests.filter((r) => r.status?.toLowerCase() === 'reopened').length;

          this.notifications = this.recentTickets.slice(0, 3).map((r) => `Ticket ${r.trackingNumber} - ${r.title}`);

          this.isLoading = false;
          this.detectChanges();
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        this.zone.run(() => {
          this.isLoading = false;
          this.detectChanges();
        });
      }
    });
  }

  getStatusSeverity(status: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status?.toLowerCase()) {
      case 'new':
        return 'info';
      case 'processing':
        return 'warn';
      case 'required_more_info':
        return 'danger';
      case 'resolved':
      case 'closed':
        return 'success';
      case 'reopened':
        return 'contrast';
      default:
        return 'secondary';
    }
  }

  getPrioritySeverity(priority: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (priority?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'danger';
      case 'medium':
        return 'warn';
      case 'low':
        return 'info';
      default:
        return 'secondary';
    }
  }

  formatStatus(status: string | undefined): string {
    if (!status) return '--';
    return status.replace(/_/g, ' ');
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
