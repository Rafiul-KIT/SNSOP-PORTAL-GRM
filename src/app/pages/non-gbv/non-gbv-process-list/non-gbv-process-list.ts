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

interface NonGbvGrievance {
  id: number;
  trackingNumber: string;
  stateId: number;
  createdAt: string;
  complainantName: string;
  reportingChannel: string;
  isComplainantBeneficiary: string;
  status: string;
}

@Component({
  selector: 'app-non-gbv-process-list',
  templateUrl: './non-gbv-process-list.html',
  styleUrl: './non-gbv-process-list.scss',
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
export class NonGbvProcessList implements OnInit {
  isLoading = true;
  searchForm!: FormGroup;

  // Geo lookup lists
  states: LookupItem[] = [];
  counties: LookupItem[] = [];
  payams: LookupItem[] = [];
  bomas: LookupItem[] = [];

  // Grievance data
  grievances: NonGbvGrievance[] = [];
  totalRecords = 0;

  // Pagination
  currentPage = 0; // 0-based
  pageSize = 10;

  // Breadcrumb
  breadcrumbItems: MenuItem[] = [];
  breadcrumbHome: MenuItem = { icon: 'fas fa-home', routerLink: '/dashboard' };

  // Status options (example, adjust as per actual statuses)
  statusOptions = [
    { label: 'Pending', value: 1 },
    { label: 'In Progress', value: 2 },
    { label: 'Resolved', value: 3 },
    { label: 'Rejected', value: 4 },
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
    this.breadcrumbItems = [{ label: 'Non-GBV Grievances Process List' }];
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
      id: f.id || 0, 
      trackingNumber: f.trackingNumber ? f.trackingNumber.trim() : '',
      stateId: f.state?.id || 0,
      countyId: f.county?.id || 0,
      payamId: f.payam?.id || 0,
      bomaId: f.boma?.id || 0,
      status: f.status || 0, // Assuming 0 or null is acceptable for empty status
    };
  }

  // Data loading
  fetchPage(page: number, size: number) {
    this.isLoading = true;
    this.cdr.markForCheck(); // Trigger change detection to show loader

    const body = this.buildSearchBody();

    this.api
      .POST(`/api/ngbv-grievance/list?page=${page}&size=${size}`, body)
      .then((res: any) => {
        if (!res || !res.data) throw new Error('Empty or invalid response');

        const data = res.data; // The API returns content, pageNumber, pageSize, totalElements directly under 'data'
        this.grievances = data.content || [];
        this.totalRecords = data.totalElements || 0;
        this.currentPage = data.pageNumber || 0; // Ensure current page is updated from response

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
        this.cdr.detectChanges();
      });
  }

  onPageChange(event: any) {
    this.currentPage = event.page;
    this.pageSize = event.rows;
    this.fetchPage(this.currentPage, this.pageSize);
  }

  searchGrievances() {
    this.currentPage = 0; // Reset to first page on new search
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
  getStatusLabel(statusValue: number): string {
    const status = this.statusOptions.find(s => s.value === statusValue);
    return status ? status.label : String(statusValue);
  }

  trackById = (_: number, grievance: NonGbvGrievance) => grievance.id;
}
