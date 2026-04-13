import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import Swal from 'sweetalert2';
import { Loader } from '../../../components/loader/loader';
import { ItSupportService, ITRequest } from '../../../services/it-support.service';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-help-desk-support-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BreadcrumbModule,
    ButtonModule,
    TableModule,
    
    TagModule,
    SelectModule,
    InputTextModule,
    Loader,
  ],
  templateUrl: './help-desk-support-management.html',
  styleUrls: ['./help-desk-support-management.scss'],
})
export class HelpDeskSupportManagement implements OnInit {
  private readonly MIS_FIRM_ROLE_IDS = [51];

  breadcrumbHome = { icon: 'fas fa-home', routerLink: '/' };
  breadcrumbItems = [{ label: 'Help Desk' }, { label: 'Support Management' }];

  isLoading = false;
  searchText = '';
  selectedStatus: string | null = null;
  selectedPriority: string | null = null;

  statuses = [
    { label: 'All', value: null },
    { label: 'New', value: 'NEW' },
    { label: 'Processing', value: 'PROCESSING' },
    { label: 'Required More Info', value: 'REQUIRED_MORE_INFO' },
    { label: 'Addressed', value: 'ADDRESSED' },
    { label: 'Resolved', value: 'RESOLVED' },
    { label: 'Closed', value: 'CLOSED' },
    { label: 'Reopened', value: 'REOPENED' },
  ];

  priorityOptions = [
    { label: 'All', value: null },
    { label: 'Critical', value: 'CRITICAL' },
    { label: 'High', value: 'HIGH' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'Low', value: 'LOW' },
  ];

  requests: ITRequest[] = [];

  constructor(
    private itSupportService: ItSupportService,
    private cdr: ChangeDetectorRef,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.loadRequests();
  }

  async loadRequests(): Promise<void> {
    this.isLoading = true;
    this.cdr.detectChanges();

    const params: any = { page: 0, size: 50 };
    if (this.selectedStatus) params.status = this.selectedStatus;
    if (this.selectedPriority) params.priority = this.selectedPriority;
    if (this.searchText.trim()) params.search = this.searchText.trim();

    try {
      const result = await this.itSupportService.getRequests(params);
      this.requests = result.items;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading support requests:', error);
      this.requests = [];
      this.cdr.detectChanges();
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  applyFilters(): void {
    this.loadRequests();
  }

  getStatusSeverity(status: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status?.toUpperCase()) {
      case 'NEW':
        return 'info';
      case 'PROCESSING':
        return 'warn';
      case 'REQUIRED_MORE_INFO':
        return 'danger';
      case 'ADDRESSED':
        return 'secondary';
      case 'RESOLVED':
      case 'CLOSED':
        return 'success';
      case 'REOPENED':
        return 'contrast';
      default:
        return 'secondary';
    }
  }

  getPrioritySeverity(priority: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return 'danger';
      case 'MEDIUM':
        return 'warn';
      case 'LOW':
        return 'info';
      default:
        return 'secondary';
    }
  }

  formatStatus(status?: string): string {
    if (!status) return '--';
    return status.replace(/_/g, ' ');
  }

  private getCurrentUser(): any {
    return this.apiService.loginState()?.user || {};
  }

  private isMisFirmUser(): boolean {
    const user = this.getCurrentUser();
    const roleId = Number(user?.roleId);
    const roleName = String(user?.roleName || user?.role || '').toUpperCase();

    return (
      this.MIS_FIRM_ROLE_IDS.includes(roleId) ||
      roleName.includes('MIS_FIRM') ||
      roleName.includes('MIS FIRM')
    );
  }

  private canTransition(fromStatus?: string, toStatus?: string): boolean {
    const from = String(fromStatus || '').toUpperCase();
    const to = String(toStatus || '').toUpperCase();
    const isMisFirm = this.isMisFirmUser();

    if (!from || !to) return false;

    // MIS firm transitions
    if (isMisFirm) {
      return (
        (from === 'NEW' && to === 'PROCESSING') ||
        (from === 'PROCESSING' && ['REQUIRED_MORE_INFO', 'ADDRESSED', 'CLOSED'].includes(to)) ||
        (from === 'REOPENED' && to === 'PROCESSING')
      );
    }

    // Requester transitions (not expected in support-management screen, but guarded here)
    return (
      (from === 'ADDRESSED' && to === 'RESOLVED') ||
      (from === 'RESOLVED' && to === 'CLOSED') ||
      (from === 'CLOSED' && to === 'REOPENED')
    );
  }

  getAvailableActions(request: ITRequest): Array<{ label: string; value: string; needsComment: boolean }> {
    if (!this.isMisFirmUser()) {
      return [];
    }

    switch (request.status?.toUpperCase()) {
      case 'NEW':
        return [{ label: 'Move to Processing', value: 'PROCESSING', needsComment: false }];
      case 'PROCESSING':
        return [
          { label: 'Ask For More Info', value: 'REQUIRED_MORE_INFO', needsComment: true },
          { label: 'Mark Addressed', value: 'ADDRESSED', needsComment: false },
          { label: 'Close', value: 'CLOSED', needsComment: true },
        ];
      case 'REOPENED':
        return [{ label: 'Move to Processing', value: 'PROCESSING', needsComment: false }];
      default:
        return [];
    }
  }

  getActionLabel(request: ITRequest): string {
    const actions = this.getAvailableActions(request);
    if (!actions.length) return 'View';
    if (actions.length === 1) return actions[0].label;
    return 'Change Status';
  }

  getActionSeverity(request: ITRequest): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    if (!this.getAvailableActions(request).length) return 'secondary';
    if (request.status?.toUpperCase() === 'PROCESSING') return 'warn';
    return 'info';
  }

  async onAction(request: ITRequest): Promise<void> {
    const actions = this.getAvailableActions(request);

    if (!actions.length) {
      await Swal.fire({
        icon: 'info',
        title: 'No Transition Available',
        text: this.isMisFirmUser()
          ? 'This request has no MIS workflow transition from its current status.'
          : 'Status update is only available for MIS Firm workflow users on this screen.',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    let selectedAction = actions[0];

    if (actions.length > 1) {
      const { value: selectedValue } = await Swal.fire({
        title: 'Select Next Status',
        input: 'select',
        inputOptions: actions.reduce((acc, action) => {
          acc[action.value] = `${action.label} (${action.value})`;
          return acc;
        }, {} as Record<string, string>),
        inputPlaceholder: 'Select transition',
        showCancelButton: true,
        confirmButtonText: 'Continue',
        confirmButtonColor: '#3085d6',
        inputValidator: (value) => (!value ? 'Please select a status transition.' : null),
      });

      if (!selectedValue) return;
      selectedAction = actions.find((a) => a.value === selectedValue) || actions[0];
    }

    let comment = '';
    if (selectedAction.needsComment) {
      const result = await Swal.fire({
        title: 'Comment Required',
        input: 'textarea',
        inputLabel: `Provide comment for ${selectedAction.value}`,
        inputPlaceholder: 'Type workflow comment',
        showCancelButton: true,
        confirmButtonText: 'Update Status',
        confirmButtonColor: '#3085d6',
        inputValidator: (value) => (!value?.trim() ? 'Comment is required for this transition.' : null),
      });

      if (!result.isConfirmed) return;
      comment = String(result.value || '').trim();
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      if (!this.canTransition(request.status, selectedAction.value)) {
        await Swal.fire({
          icon: 'warning',
          title: 'Invalid Transition',
          text: `Invalid status transition from ${request.status} to ${selectedAction.value}.`,
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      const response = await this.itSupportService.updateRequestStatus(request.id, {
        status: selectedAction.value,
        ...(comment ? { comment } : {}),
      });

      if (response.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Status Updated',
          text: response.message || 'Request status updated successfully.',
          confirmButtonColor: '#3085d6',
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: response.message || 'Unable to update request status.',
          confirmButtonColor: '#d33',
        });
      }
    } catch {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An unexpected error occurred while updating status.',
        confirmButtonColor: '#d33',
      });
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
      this.loadRequests();
    }
  }
}
