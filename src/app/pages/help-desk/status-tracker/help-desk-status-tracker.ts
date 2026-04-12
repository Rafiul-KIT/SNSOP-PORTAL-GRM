import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { InputGroupModule } from 'primeng/inputgroup';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ItSupportService, ITRequest } from '../../../services/it-support.service';

@Component({
  selector: 'app-help-desk-status-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbModule, ButtonModule, InputTextModule, TagModule, InputGroupModule, ProgressSpinnerModule],
  templateUrl: './help-desk-status-tracker.html',
  styleUrls: ['./help-desk-status-tracker.scss']
})
export class HelpDeskStatusTracker {
  breadcrumbHome = { icon: 'fas fa-home', routerLink: '/' };
  breadcrumbItems = [{ label: 'Help Desk' }, { label: 'Status Tracker' }];

  searchTrackingNo = '';
  ticketResult: ITRequest | null = null;
  isLoading = false;
  notFound = false;

  constructor(
    private itSupportService: ItSupportService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  private detectChanges(): void {
    this.cdr.detectChanges();
  }

  async checkStatus(): Promise<void> {
    const trackingNo = this.searchTrackingNo.trim();
    
    if (!trackingNo) {
      this.ticketResult = null;
      this.notFound = false;
      this.detectChanges();
      return;
    }

    this.isLoading = true;
    this.notFound = false;
    this.ticketResult = null;
    this.detectChanges();

    this.zone.runOutsideAngular(async () => {
      try {
        const result = await this.itSupportService.getRequestByTrackingNumber(trackingNo);

        this.zone.run(() => {
          this.ticketResult = result;
          this.notFound = !result;
          this.isLoading = false;
          this.detectChanges();
        });
      } catch (error) {
        console.error('Error fetching ticket:', error);
        this.zone.run(() => {
          this.ticketResult = null;
          this.notFound = true;
          this.isLoading = false;
          this.detectChanges();
        });
      }
    });
  }

  trackRequest(): void {
    this.searchTrackingNo = 'SNSOP-SUP-2026-000121';
    this.checkStatus();
  }

  getStatusSeverity(status: string | undefined): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" {
    switch (status?.toLowerCase()) {
      case 'in_progress': return 'warn';
      case 'resolved': return 'success';
      case 'closed': return 'success';
      case 'pending': return 'info';
      case 'open': return 'info';
      case 'reopened': return 'contrast';
      default: return 'secondary';
    }
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  getTimelineHistory(): { title: string; detail: string; date: string }[] {
    if (!this.ticketResult?.history?.length) {
      return [];
    }

    return this.ticketResult.history.map(h => ({
      title: h.action || 'Status Update',
      detail: h.comment || h.changes || '',
      date: this.formatDate(h.performedAt)
    }));
  }
}
