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
import { GrievanceListStateService } from '../../../services/grievance-list-state.service';

interface NonGbvGrievance {
  id: number;
  trackingNumber: string;
  grievanceType: string;
  incidentOccurredAt: string;
  incidentOccurredAtDisplay?: string;
  createdAt: string;
  complainantName: string;
  reportingChannel: string;
  isComplainantBeneficiary: string;
  beneficiaryStatus?: string;
  status: string | number;
  statusLabel?: string;
  statusBadgeClass?: string;
  isOverdue?: boolean;
  daysElapsed?: number;
  resolvedOn?: string;
  resolvedOnDisplay?: string;
}

@Component({
  selector: 'app-non-gbv-list',
  templateUrl: './non-gbv-list.html',
  styleUrl: './non-gbv-list.scss',
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
export class NonGbvList implements OnInit {
  private readonly stateKey = 'non-gbv-list';
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
  grievances: NonGbvGrievance[] = [];
  totalRecords = 0;
  archivingId: number | null = null;

  // Pagination
  currentPage = 0; // 0-based
  pageSize = 10;

  // Breadcrumb
  breadcrumbItems: MenuItem[] = [];
  breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/dashboard' };

  // Status options (example, adjust as per actual statuses)
  statusOptions = [
    { label: 'Unresolved', value: 1 },
    { label: 'Resolved', value: 5 },
  ];

  // Gender options
  genderOptions = [
    { label: 'Male', value: 0 },
    { label: 'Female', value: 1 },
  ];

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private router: Router,
    private api: ApiService,
    private lookup: LookupService,
    private cdr: ChangeDetectorRef,
    private listState: GrievanceListStateService
  ) {}

  async ngOnInit() {
    this.initBreadcrumb();
    this.initForm();
    await this.loadInitialLookups();
    await this.restoreListState();
    this.fetchPage(this.currentPage, this.pageSize);
  }

  initBreadcrumb() {
    this.breadcrumbItems = [{ label: 'Non-GBV Grievances List' }];
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
      complainantGender: [null],
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
    this.saveListState();
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
    this.saveListState();
    this.cdr.markForCheck();
  }

  async onPayamChange(payam: LookupItem | null) {
    this.searchForm.get('boma')?.reset({ value: null, disabled: true });
    this.bomas = [];

    if (payam?.id) {
      this.bomas = await this.lookup.getBomaListByPayamId(payam.id);
      this.searchForm.get('boma')?.enable();
    }
    this.saveListState();
    this.cdr.markForCheck();
  }

  // Request building
  private buildSearchBody() {
    const f = this.searchForm.value;
    return {
      id: f.id || null, // Assuming 0 or null is acceptable for empty ID
      trackingNumber: f.trackingNumber ? f.trackingNumber.trim() : '',
      stateId: f.state?.id || null,
      countyId: f.county?.id || null,
      payamId: f.payam?.id || null,
      bomaId: f.boma?.id || null,
      status: f.status || null, // Assuming 0 or null is acceptable for empty status
      complainantGender: f.complainantGender ?? null,
    };
  }

  // Data loading
  fetchPage(page: number, size: number) {
    if (this.hasInitialLoadCompleted) {
      this.isTableLoading = true;
    } else {
      this.isLoading = true;
    }
    this.cdr.markForCheck(); // Trigger change detection to show loader

    const body = this.buildSearchBody();

    this.api
      .POST(`/api/ngbv-grievance/list?page=${page}&size=${size}`, body)
      .then((res: any) => {
        if (!res || !res.data) throw new Error('Empty or invalid response');

        const data = res.data; // The API returns content, pageNumber, pageSize, totalElements directly under 'data'
        this.grievances = this.enrichGrievances(data.content || []);
        this.totalRecords = data.totalElements || 0;
        this.currentPage = data.pageNumber || 0; // Ensure current page is updated from response
        this.hasInitialLoadCompleted = true;
        this.saveListState();

        if (this.grievances.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Search',
            detail: 'No non-GBV grievances found',
          });
        }
      })
      .catch((err) => {
        console.error('Fetch non-GBV grievances error:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to fetch non-GBV grievances',
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
    this.saveListState();
    this.fetchPage(this.currentPage, this.pageSize);
  }

  searchGrievances() {
    this.currentPage = 0; // Reset to first page on new search
    this.saveListState();
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
      complainantGender: null,
    });
    this.counties = [];
    this.payams = [];
    this.bomas = [];
    this.currentPage = 0;
    this.listState.clear(this.stateKey);
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

  // Helper to get state name for display (assuming stateId in grievance data)
  getStateName(stateId: number): string {
    const state = this.states.find(s => s.id === String(stateId));
    return state ? state.name : String(stateId);
  }

  // Helper to get county name for display
  getCountyName(countyId: number): string {
    const county = this.counties.find(c => c.id === String(countyId));
    return county ? county.name : String(countyId);
  }

  // Helper to get payam name for display
  getPayamName(payamId: number): string {
    const payam = this.payams.find(p => p.id === String(payamId));
    return payam ? payam.name : String(payamId);
  }

  // Helper to get boma name for display
  getBomaName(bomaId: number): string {
    const boma = this.bomas.find(b => b.id === String(bomaId));
    return boma ? boma.name : String(bomaId);
  }

  // Helper to get status label for display
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

  private enrichGrievances(list: NonGbvGrievance[]): NonGbvGrievance[] {
    const now = new Date();
    return list.map((item) => {
      const statusLabel = this.getStatusLabel(item.status);
      const isResolved = String(item.status).toLowerCase() === '5' || String(item.status).toLowerCase() === 'resolved';
      let daysElapsed = 0;
      let isOverdue = false;
      if (item.createdAt && !isResolved) {
        const createdDate = new Date(item.createdAt);
        daysElapsed = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        isOverdue = daysElapsed > 15;
      }
      const resolvedOn = (item as any).resolvedOn ?? (item as any).resolved_on ?? '';
      return {
        ...item,
        incidentOccurredAtDisplay: this.formatDisplayDate(item.incidentOccurredAt),
        beneficiaryStatus: item.isComplainantBeneficiary === 'YES' ? 'Beneficiary' : 'Non-Beneficiary',
        statusLabel,
        statusBadgeClass: this.getStatusBadgeClass(item.status),
        isOverdue,
        daysElapsed,
        resolvedOn,
        resolvedOnDisplay: this.formatDisplayDate(resolvedOn),
      };
    });
  }

  trackById = (_: number, grievance: NonGbvGrievance) => grievance.id;

  onView(grievance: NonGbvGrievance): void {
    this.saveListState();
    this.router.navigate(['/non-gbv-management/details', grievance.id], {
      queryParams: { status: grievance.status }
    });
  }

  private saveListState(): void {
    const f = this.searchForm.value;
    this.listState.set(this.stateKey, {
      currentPage: this.currentPage,
      pageSize: this.pageSize,
      id: f.id ?? null,
      trackingNumber: f.trackingNumber ?? '',
      stateId: f.state?.id ?? null,
      countyId: f.county?.id ?? null,
      payamId: f.payam?.id ?? null,
      bomaId: f.boma?.id ?? null,
      status: f.status ?? null,
      complainantGender: f.complainantGender ?? null,
    });
  }

  private async restoreListState(): Promise<void> {
    const saved = this.listState.get(this.stateKey);
    if (!saved) return;

    this.currentPage = saved.currentPage ?? 0;
    this.pageSize = saved.pageSize ?? 10;
    this.searchForm.patchValue({
      id: saved.id,
      trackingNumber: saved.trackingNumber || '',
      status: saved.status,
      complainantGender: saved.complainantGender ?? null,
    });

    if (!saved.stateId) return;
    const state = this.states.find((s) => s.id === String(saved.stateId)) || null;
    if (!state) return;

    this.searchForm.patchValue({ state });
    await this.onStateChange(state);

    if (!saved.countyId) return;
    const county = this.counties.find((c) => c.id === String(saved.countyId)) || null;
    if (!county) return;

    this.searchForm.patchValue({ county });
    await this.onCountyChange(county);

    if (!saved.payamId) return;
    const payam = this.payams.find((p) => p.id === String(saved.payamId)) || null;
    if (!payam) return;

    this.searchForm.patchValue({ payam });
    await this.onPayamChange(payam);

    if (!saved.bomaId) return;
    const boma = this.bomas.find((b) => b.id === String(saved.bomaId)) || null;
    if (!boma) return;

    this.searchForm.patchValue({ boma });
  }

  // onArchive(grievanceId: number): void {
  //   Swal.fire({
  //     title: 'Archive this grievance?',
  //     text: 'This grievance will be moved to archive.',
  //     icon: 'warning',
  //     showCancelButton: true,
  //     confirmButtonColor: '#d33',
  //     cancelButtonColor: '#6c757d',
  //     confirmButtonText: 'Yes, archive it',
  //   }).then((result) => {
  //     if (!result.isConfirmed) return;

  //     this.archivingId = grievanceId;
  //     this.cdr.markForCheck();

  //     this.api
  //       .PUT(`/api/ngbv-grievance/archive?id=${grievanceId}`)
  //       .then((res: any) => {
  //         const data = res?.data;
  //         if (data?.code === 200) {
  //           Swal.fire({
  //             title: 'Archived!',
  //             text: data?.message || 'Grievance archived successfully.',
  //             icon: 'success',
  //             confirmButtonColor: '#0d6efd',
  //           });
  //           this.fetchPage(this.currentPage, this.pageSize);
  //         } else {
  //           this.messageService.add({
  //             severity: 'error',
  //             summary: 'Archive Failed',
  //             detail: data?.message || 'Failed to archive grievance.',
  //           });
  //         }
  //       })
  //       .catch((error) => {
  //         console.error('Archive grievance error:', error);
  //         this.messageService.add({
  //           severity: 'error',
  //           summary: 'Error',
  //           detail: 'An error occurred while archiving grievance.',
  //         });
  //       })
  //       .finally(() => {
  //         this.archivingId = null;
  //         this.cdr.markForCheck();
  //       });
  //   });
  // }
}
