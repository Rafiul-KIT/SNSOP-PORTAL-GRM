import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { PaginatorModule } from 'primeng/paginator';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { TooltipModule } from 'primeng/tooltip';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { MessageService, MenuItem } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import {
  LookupItem,
  LookupService,
} from '../../../services/lookup.service';
import { ApiService } from '../../../services/api.service';
import { Loader } from '../../../components/loader/loader';
import Swal from 'sweetalert2';

interface GbvGrievance {
  id: number;
  trackingNumber: string;
  grievanceType: string;
  createdAt?: string;
  createdAtDisplay?: string;
  incidentOccurredAt: string;
  incidentOccurredAtDisplay?: string;
  complainantName: string;
  reportingChannel: string;
  isComplainantBeneficiary: string;
  beneficiaryStatus?: string;
  status: string | number;
  statusLabel?: string;
  statusBadgeClass?: string;
}

@Component({
  selector: 'app-gbv-list',
  templateUrl: './gbv-list.html',
  styleUrl: './gbv-list.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    ToastModule,
    PaginatorModule,
    BreadcrumbModule,
    FloatLabelModule,
    SelectModule,
    RouterModule,
    TooltipModule,
    Loader,
    InputTextModule
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GbvList implements OnInit {
  isLoading = true;
  isTableLoading = false;
  hasInitialLoadCompleted = false;
  searchForm!: FormGroup;

  // Geo lookup lists
  states: LookupItem[] = [];
  stateNameMap: Record<string, string> = {};
  counties: LookupItem[] = [];
  payams: LookupItem[] = [];
  bomas: LookupItem[] = [];

  // Grievance data
  grievances: GbvGrievance[] = [];
  totalRecords = 0;
  archivingId: number | null = null;

  // Pagination
  currentPage = 0; // 0-based
  pageSize = 10;

  // Breadcrumb
  breadcrumbItems: MenuItem[] = [];
  breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/dashboard' };

  // Status options
  statusOptions = [
    { label: 'Unresolved', value: 1 },
    { label: 'Resolved', value: 5 },
    { label: 'Referred', value: 15 },
  ];

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private router: Router,
    private api: ApiService,
    private lookup: LookupService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.initBreadcrumb();
    this.initForm();
    await this.loadInitialLookups();
    this.fetchPage(this.currentPage, this.pageSize);
  }

  initBreadcrumb() {
    this.breadcrumbItems = [{ label: 'GBV Grievances List' }];
  }

  initForm() {
    this.searchForm = this.fb.group({
      id: [null],
      trackingNumber: [''],
      state: [null],
      county: [{ value: null, disabled: true }],
      payam: [{ value: null, disabled: true }],
      boma: [{ value: null, disabled: true }],
      status: [null],
    });
  }

  async loadInitialLookups() {
    try {
      await this.lookup.getOrFetchStateList();
      this.states = this.lookup.getStateList();
      this.stateNameMap = this.states.reduce<Record<string, string>>((acc, s) => {
        acc[String(s.id)] = s.name;
        return acc;
      }, {});
      this.cdr.markForCheck();
    } catch (err) {
      console.error('Lookups loading error:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load lookup data.',
      });
    }
  }

  // Dependent dropdowns
  async onStateChange(state: LookupItem | null) {
    this.searchForm.get('county')?.reset({ value: null, disabled: true });
    this.searchForm.get('payam')?.reset({ value: null, disabled: true });
    this.searchForm.get('boma')?.reset({ value: null, disabled: true });
    this.counties = [];
    this.payams = [];
    this.bomas = [];

    if (state?.id) {
      this.counties = await this.lookup.getCountyListByStateId(state.id);
      this.searchForm.get('county')?.enable();
    }
    this.cdr.markForCheck();
  }

  async onCountyChange(county: LookupItem | null) {
    this.searchForm.get('payam')?.reset({ value: null, disabled: true });
    this.searchForm.get('boma')?.reset({ value: null, disabled: true });
    this.payams = [];
    this.bomas = [];

    if (county?.id) {
      this.payams = await this.lookup.getPayamListByCountyId(county.id);
      this.searchForm.get('payam')?.enable();
    }
    this.cdr.markForCheck();
  }

  async onPayamChange(payam: LookupItem | null) {
    this.searchForm.get('boma')?.reset({ value: null, disabled: true });
    this.bomas = [];

    if (payam?.id) {
      this.bomas = await this.lookup.getBomaListByPayamId(payam.id);
      this.searchForm.get('boma')?.enable();
    }
    this.cdr.markForCheck();
  }

  // Request building
  private buildSearchBody() {
    const f = this.searchForm.value;
    return {
      id: f.id || null,
      trackingNumber: f.trackingNumber ? f.trackingNumber.trim() : '',
      stateId: f.state?.id || null,
      countyId: f.county?.id || null,
      payamId: f.payam?.id || null,
      bomaId: f.boma?.id || null,
      status: f.status || null,
    };
  }

  // Data loading
  fetchPage(page: number, size: number) {
    if (this.hasInitialLoadCompleted) {
      this.isTableLoading = true;
    } else {
      this.isLoading = true;
    }
    this.cdr.markForCheck();

    const body = this.buildSearchBody();

    this.api
      .POST(`/api/gbv-grievance/list?page=${page}&size=${size}`, body)
      .then((res: any) => {
        if (!res || !res.data) throw new Error('Empty or invalid response');

        const data = Array.isArray(res.data?.content)
          ? res.data
          : (res.data?.data ?? res.data);
        this.grievances = this.enrichGrievances(data.content || []);
        this.totalRecords = data.totalElements || 0;
        this.currentPage = data.pageNumber || 0;
        this.hasInitialLoadCompleted = true;

        if (this.grievances.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Search',
            detail: 'No GBV grievances found',
          });
        }
      })
      .catch((err) => {
        console.error('Fetch GBV grievances error:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to fetch GBV grievances',
        });
      })
      .finally(() => {
        this.isLoading = false;
        this.isTableLoading = false;
        this.cdr.detectChanges();
      });
  }

  onPageChange(event: any) {
    this.currentPage = event.page;
    this.pageSize = event.rows;
    this.fetchPage(this.currentPage, this.pageSize);
  }

  searchGrievances() {
    this.currentPage = 0;
    this.fetchPage(this.currentPage, this.pageSize);
  }

  resetForm() {
    this.searchForm.reset({
      id: null,
      trackingNumber: '',
      state: null,
      county: { value: null, disabled: true },
      payam: { value: null, disabled: true },
      boma: { value: null, disabled: true },
      status: null,
    });
    this.counties = [];
    this.payams = [];
    this.bomas = [];
    this.currentPage = 0;
    this.fetchPage(this.currentPage, this.pageSize);
    this.cdr.markForCheck();
  }

  formatDisplayDate(value: string | null | undefined): string {
    if (!value) return '';

    const ddMmYyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
    const match = value.match(ddMmYyyy);

    if (match) {
      const day = Number(match[1]);
      const month = Number(match[2]) - 1;
      const year = Number(match[3]);
      const date = new Date(year, month, day);
      return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat('en-GB').format(date);
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('en-GB').format(date);
  }

  getStateName(stateId: number): string {
    const state = this.states.find(s => s.id === String(stateId));
    return state ? state.name : String(stateId);
  }

  getStatusLabel(statusValue: string | number): string {
    const statusMap: Record<string, string> = {
      '1': 'Unresolved',
      '5': 'Resolved',
      '15': 'Referred',
      Unresolved: 'Unresolved',
      Resolved: 'Resolved',
      Referred: 'Referred',
    };
    return statusMap[String(statusValue)] ?? String(statusValue);
  }

  getStatusBadgeClass(statusValue: string | number): string {
    const label = this.getStatusLabel(statusValue);
    if (label === 'Resolved') return 'bg-success';
    if (label === 'Referred') return 'bg-danger';
    return 'bg-warning';
  }

  private enrichGrievances(list: GbvGrievance[]): GbvGrievance[] {
    return list.map((item) => {
      const row: any = item as any;
      const grievanceType =
        row.grievanceType ??
        row.grievance_type ??
        row.grievanceTypeName ??
        '';
      const complainantName =
        row.complainantName ??
        row.complainant_name ??
        row.complainant ??
        '';
      const createdAt = row.createdAt ?? row.created_at ?? '';
      const incidentOccurredAt = row.incidentOccurredAt ?? row.incidentDate ?? '';
      const beneficiaryRaw = row.isComplainantBeneficiary ?? '';
      const statusLabel = this.getStatusLabel(row.status);

      return {
        ...item,
        grievanceType,
        complainantName,
        createdAt,
        createdAtDisplay: this.formatDisplayDate(createdAt),
        incidentOccurredAt,
        incidentOccurredAtDisplay: this.formatDisplayDate(incidentOccurredAt),
        beneficiaryStatus:
          beneficiaryRaw === 'YES'
            ? 'Beneficiary'
            : beneficiaryRaw === 'NO'
              ? 'Non-Beneficiary'
              : String(beneficiaryRaw || '-'),
        statusLabel,
        statusBadgeClass: this.getStatusBadgeClass(row.status),
      };
    });
  }

  trackById = (_: number, grievance: GbvGrievance) => grievance.id;

  onView(grievanceId: number): void {
    this.router.navigate(['/gbv-management/details', grievanceId]);
  }

  onArchive(gbvGrievanceId: number): void {
    Swal.fire({
      title: 'Archive this grievance?',
      text: 'This grievance will be moved to archive.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, archive it',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.archivingId = gbvGrievanceId;
      this.cdr.markForCheck();

      this.api
        .PUT(`/api/gbv-grievance/archive?gbvGrievanceId=${gbvGrievanceId}`)
        .then((res: any) => {
          const data = res?.data;
          if (data?.code === 200) {
            Swal.fire({
              title: 'Archived!',
              text: data?.message || 'GBV grievance archived successfully.',
              icon: 'success',
              confirmButtonColor: '#0d6efd',
            });
            this.fetchPage(this.currentPage, this.pageSize);
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Archive Failed',
              detail: data?.message || 'Failed to archive GBV grievance.',
            });
          }
        })
        .catch((err) => {
          console.error('Archive GBV grievance error:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'An error occurred while archiving GBV grievance.',
          });
        })
        .finally(() => {
          this.archivingId = null;
          this.cdr.markForCheck();
        });
    });
  }
}
