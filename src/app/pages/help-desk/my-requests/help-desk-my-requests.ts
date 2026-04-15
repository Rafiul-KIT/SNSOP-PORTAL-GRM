import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { Loader } from '../../../components/loader/loader';
import { ItSupportService, ITRequest } from '../../../services/it-support.service';

import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-help-desk-my-requests',
  standalone: true,
  imports: [CommonModule, BreadcrumbModule, ButtonModule, TagModule, SelectModule, InputTextModule, FormsModule, Loader, TableModule],
  templateUrl: './help-desk-my-requests.html',
  styleUrls: ['./help-desk-my-requests.scss']
})
export class HelpDeskMyRequests implements OnInit {
  breadcrumbHome = { icon: 'fas fa-home', routerLink: '/' };
  breadcrumbItems = [{ label: 'Help Desk' }, { label: 'My Requests' }];

  isLoading = false;
  requests: ITRequest[] = [];
  filteredRequests: ITRequest[] = [];

  summary = {
    total: 0,
    resolved: 0,
    pending: 0,
    reopened: 0
  };

  statusOptions = [
    { label: 'All', value: '' },
    { label: 'New', value: 'NEW' },
    { label: 'Processing', value: 'PROCESSING' },
    { label: 'Required More Info', value: 'REQUIRED_MORE_INFO' },
    { label: 'Addressed', value: 'ADDRESSED' },
    { label: 'Resolved', value: 'RESOLVED' },
    { label: 'Closed', value: 'CLOSED' },
    { label: 'Reopened', value: 'REOPENED' }
  ];

  priorityOptions = [
    { label: 'All Priorities', value: '' },
    { label: 'Critical', value: 'CRITICAL' },
    { label: 'High', value: 'HIGH' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'Low', value: 'LOW' }
  ];

  selectedStatus = '';
  selectedPriority = '';

  feedback = {
    rating: 5,
    comment: 'Quick response and clear guidance from the helpdesk officer.'
  };

  constructor(
    private itSupportService: ItSupportService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private router: Router
  ) {}

  private detectChanges(): void {
    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    this.loadRequests();
  }

  async loadRequests(): Promise<void> {
    this.isLoading = true;
    this.detectChanges();

    const params: any = { size: 50 };
    if (this.selectedStatus) params.status = this.selectedStatus;
    if (this.selectedPriority) params.priority = this.selectedPriority;

    this.zone.runOutsideAngular(async () => {
      try {
        const result = await this.itSupportService.getRequests(params);

        this.zone.run(() => {
          this.requests = result.items;
          this.filteredRequests = result.items;
          this.calculateSummary();
          this.isLoading = false;
          this.detectChanges();
        });
      } catch (error) {
        console.error('Error loading requests:', error);
        this.zone.run(() => {
          this.isLoading = false;
          this.detectChanges();
        });
      }
    });
  }

  filterRequests(): void {
    this.loadRequests();
  }

  calculateSummary(): void {
    this.summary.total = this.requests.length;
    this.summary.resolved = this.requests.filter(
      (r) => r.status?.toLowerCase() === 'resolved' || r.status?.toLowerCase() === 'closed'
    ).length;
    this.summary.pending = this.requests.filter(
      (r) => r.status?.toLowerCase() === 'new' || r.status?.toLowerCase() === 'processing' || r.status?.toLowerCase() === 'required_more_info'
    ).length;
    this.summary.reopened = this.requests.filter((r) => r.status?.toLowerCase() === 'reopened').length;
  }

  onView(request: ITRequest): void {
    this.router.navigate(['/help-desk/request-detail', request.id]);
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
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
      case 'addressed':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  getStars(count: number): number[] {
    return Array(count).fill(0);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
